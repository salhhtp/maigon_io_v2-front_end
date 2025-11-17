import { parseISO } from "date-fns";
import {
  CLIArgs,
  SUPABASE_URL,
  findAuthUserByEmail,
  formatTable,
  generatePassword,
  isInteractive,
  normalizeEmail,
  printError,
  printSuccess,
  prompt,
  promptHidden,
  supabase,
} from "./utils";

type CreateAdminOptions = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  nonInteractive?: boolean;
};

export async function createAdmin(args: CLIArgs) {
  const options: CreateAdminOptions = {
    email: typeof args.email === "string" ? args.email : undefined,
    password: typeof args.password === "string" ? args.password : undefined,
    firstName:
      typeof args["first-name"] === "string" ? args["first-name"] : undefined,
    lastName:
      typeof args["last-name"] === "string" ? args["last-name"] : undefined,
    company: typeof args.company === "string" ? args.company : undefined,
    nonInteractive: Boolean(args["non-interactive"]),
  };

  try {
    if (args.debug) {
      console.log(`Using Supabase URL: ${SUPABASE_URL}`);
      console.log(`Interactive terminal: ${isInteractive()}`);
    }

    const email =
      normalizeEmail(options.email) ??
      (options.nonInteractive
        ? (() => {
            throw new Error("Missing --email in non-interactive mode.");
          })()
        : normalizeEmail(await prompt("Email address")));
    if (!email) {
      throw new Error("Email is required.");
    }

    const password =
      options.password ??
      (options.nonInteractive || !isInteractive()
        ? ""
        : await promptHidden("Password (leave empty to auto-generate)"));

    const finalPassword =
      password && password.length > 0 ? password : generatePassword();

    const firstName =
      options.firstName ??
      (options.nonInteractive ? "" : await prompt("First name (optional)", { defaultValue: "" }));

    const lastName =
      options.lastName ??
      (options.nonInteractive ? "" : await prompt("Last name (optional)", { defaultValue: "" }));

    const company =
      options.company ??
      (options.nonInteractive
        ? "Admin"
        : await prompt("Company (optional)", { defaultValue: "Admin" }));

    // Check existing auth user
    const existingAuth = await findAuthUserByEmail(email);
    if (args.debug) {
      console.log("Existing auth user:", existingAuth);
    }
    if (existingAuth) {
      printError(
        `Auth user with email ${email} already exists. Delete it first or choose another email.`,
      );
      return;
    }

    // Create auth user
    const creation = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company,
        role: "admin",
        is_temporary_password: true,
      },
    });

    if (creation.error || !creation.data?.user) {
      throw creation.error ?? new Error("Failed to create auth user.");
    }

    const authUser = creation.data.user;

    // Create profile
    const profileUpsert = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: authUser.id,
          auth_user_id: authUser.id,
          email,
          first_name: firstName ?? "",
          last_name: lastName ?? "",
          company: company ?? "Admin",
          role: "admin",
          is_active: true,
        },
        { onConflict: "id" },
      )
      .select("id");

    if (profileUpsert.error) {
      throw profileUpsert.error;
    }

    printSuccess("Admin user created successfully.");
    console.log(`Email: ${email}`);
    console.log(`Temporary password: ${finalPassword}`);
    console.log(`User ID: ${authUser.id}`);
  } catch (error) {
    if (args.debug && error instanceof Error) {
      console.error(error);
    }
    printError(
      error instanceof Error ? error.message : "Failed to create admin user.",
    );
  }
}

export async function listAdmins() {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, company, is_active, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || !data.length) {
      console.log("No admin users found.");
      return;
    }

    formatTable(
      data.map((row) => ({
        ...row,
        created_at: row.created_at
          ? parseISO(row.created_at).toLocaleString()
          : null,
      })),
      [
        { key: "email", label: "Email" },
        { key: "first_name", label: "First Name" },
        { key: "last_name", label: "Last Name" },
        { key: "company", label: "Company" },
        { key: "is_active", label: "Active" },
        { key: "created_at", label: "Created" },
      ],
    );
  } catch (error) {
    printError(
      error instanceof Error ? error.message : "Failed to list admin users.",
    );
  }
}

export async function deleteAdmin(args: CLIArgs) {
  const providedEmail =
    typeof args.email === "string" ? normalizeEmail(args.email) : undefined;
  const nonInteractive = Boolean(args["non-interactive"]);

  try {
    const email =
      providedEmail ??
      (nonInteractive
        ? (() => {
            throw new Error("Missing --email in non-interactive mode.");
          })()
        : normalizeEmail(await prompt("Email address to delete")));

    if (!email) {
      throw new Error("Email is required.");
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("id, auth_user_id")
      .eq("email", email)
      .eq("role", "admin")
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      const authCandidate = await findAuthUserByEmail(email);
      if (!authCandidate) {
        printError(`No admin profile or auth user found for ${email}.`);
        return;
      }

      const authDelete = await supabase.auth.admin.deleteUser(authCandidate.id);
      if (authDelete.error) throw authDelete.error;

      printSuccess(`Deleted auth user ${email}. (No profile was present.)`);
      return;
    }

    const authUserId = profile.auth_user_id ?? profile.id;

    const authDelete = await supabase.auth.admin.deleteUser(authUserId);
    if (authDelete.error) {
      throw authDelete.error;
    }

    const { error: profileDeleteError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", profile.id);

    if (profileDeleteError) {
      throw profileDeleteError;
    }

    printSuccess(`Deleted admin user ${email}.`);
  } catch (error) {
    printError(
      error instanceof Error ? error.message : "Failed to delete admin user.",
    );
  }
}
