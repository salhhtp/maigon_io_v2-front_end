import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  action: "create" | "list" | "delete" | "update";
  adminKey?: string;
}

// Admin management key - change this to something secure
const ADMIN_MANAGEMENT_KEY = Deno.env.get("ADMIN_MANAGEMENT_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const request: CreateAdminRequest = await req.json();

    if (!ADMIN_MANAGEMENT_KEY) {
      return new Response(
        JSON.stringify({ error: "Admin management key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate admin key
    if (request.adminKey !== ADMIN_MANAGEMENT_KEY) {
      return new Response(
        JSON.stringify({ error: "Invalid admin management key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase admin client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    switch (request.action) {
      case "create":
        return await createAdminUser(supabase, request);
      case "list":
        return await listAdminUsers(supabase);
      case "delete":
        return await deleteAdminUser(supabase, request.email);
      case "update":
        return await updateAdminUser(supabase, request);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Admin management error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function createAdminUser(supabase: any, request: CreateAdminRequest) {
  try {
    console.log("Creating admin user:", request.email);

    // Check if user already exists in auth
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
      (user: any) => user.email === request.email,
    );

    if (existingAuthUser) {
      console.log("Auth user already exists");
      return new Response(
        JSON.stringify({
          error: "User already exists in auth system",
          user: { email: request.email, id: existingAuthUser.id },
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("email, role, auth_user_id")
      .eq("email", request.email)
      .single();

    if (existingProfile) {
      console.log("Profile already exists");
      return new Response(
        JSON.stringify({
          error: "User profile already exists",
          user: existingProfile,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Creating new auth user...");

    // Create auth user using admin API with full privileges
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: request.email,
        password: request.password,
        email_confirm: true, // Auto-confirm email so they can sign in immediately
        user_metadata: {
          first_name: request.firstName,
          last_name: request.lastName,
          company: request.company || "Admin",
          role: "admin",
        },
      });

    if (authError) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({
          error: "Failed to create auth user",
          details: authError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Auth user created successfully:", authUser.user.id);

    // Create user profile linked to auth user
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        auth_user_id: authUser.user.id,
        email: request.email,
        first_name: request.firstName,
        last_name: request.lastName,
        company: request.company || "Admin",
        role: "admin",
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Cleanup: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({
          error: "Failed to create user profile",
          details: profileError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Profile created successfully");

    // Create user plan for unlimited access
    const { error: planError } = await supabase.from("user_plans").insert({
      user_id: authUser.user.id,
      plan_type: "professional",
      plan_name: "Professional Plan",
      price: 0,
      contracts_limit: 999999,
      contracts_used: 0,
      billing_cycle: "monthly",
      features: [
        "unlimited_reviews",
        "custom_solutions",
        "admin_access",
        "advanced_analytics",
      ],
    });

    if (planError) {
      console.warn("Plan creation warning (non-critical):", planError);
    }

    // Create usage stats
    const { error: statsError } = await supabase
      .from("user_usage_stats")
      .insert({
        user_id: profile.id,
        contracts_reviewed: 0,
        total_pages_reviewed: 0,
        risk_assessments_completed: 0,
        compliance_checks_completed: 0,
      });

    if (statsError) {
      console.warn("Stats creation warning (non-critical):", statsError);
    }

    console.log("Admin user setup complete!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully and can sign in immediately",
        user: {
          id: authUser.user.id,
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          role: "admin",
          can_sign_in: true,
          email_confirmed: true,
          created_at: authUser.user.created_at,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Create admin user error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create admin user",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function listAdminUsers(supabase: any) {
  try {
    console.log("Fetching admin users...");

    // Get admin profiles with auth info
    const { data: adminUsers, error } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        company,
        role,
        is_active,
        created_at,
        auth_user_id
      `,
      )
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch admin users:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch admin users",
          details: error.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // For each admin user, check if they can actually sign in
    const usersWithSignInStatus = await Promise.all(
      adminUsers.map(async (user) => {
        let canSignIn = false;
        let emailConfirmed = false;

        if (user.auth_user_id) {
          try {
            // Get auth user details
            const { data: authUser } = await supabase.auth.admin.getUserById(
              user.auth_user_id,
            );
            if (authUser?.user) {
              canSignIn = true;
              emailConfirmed = authUser.user.email_confirmed_at !== null;
            }
          } catch (error) {
            console.warn(
              `Could not fetch auth info for user ${user.email}:`,
              error,
            );
          }
        }

        return {
          ...user,
          can_sign_in: canSignIn,
          email_confirmed: emailConfirmed,
          auth_linked: !!user.auth_user_id,
        };
      }),
    );

    console.log(`Found ${adminUsers.length} admin users`);

    return new Response(
      JSON.stringify({
        success: true,
        admin_users: usersWithSignInStatus,
        count: adminUsers.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("List admin users error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to list admin users",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function deleteAdminUser(supabase: any, email: string) {
  try {
    // Get user profile first
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("auth_user_id, role")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "User is not an admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete auth user (this will cascade to profile due to foreign key)
    if (profile.auth_user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(
        profile.auth_user_id,
      );
      if (authError) {
        console.error("Auth deletion error:", authError);
        return new Response(
          JSON.stringify({
            error: "Failed to delete admin user",
            details: authError.message,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      // If no auth user, delete profile directly
      const { error: deleteError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("email", email);

      if (deleteError) {
        return new Response(
          JSON.stringify({
            error: "Failed to delete user profile",
            details: deleteError.message,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user deleted successfully",
        email: email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Delete admin user error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete admin user",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function updateAdminUser(supabase: any, request: CreateAdminRequest) {
  try {
    const updates: any = {};
    if (request.firstName) updates.first_name = request.firstName;
    if (request.lastName) updates.last_name = request.lastName;
    if (request.company) updates.company = request.company;

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("email", request.email)
      .eq("role", "admin")
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to update admin user",
          details: error.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user updated successfully",
        user: profile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Update admin user error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update admin user",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}
