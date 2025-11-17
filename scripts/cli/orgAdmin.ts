import { parseISO } from "date-fns";
import {
  CLIArgs,
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
  uuid,
} from "./utils";
import { PLAN_CATALOG, getPlanByKey } from "../../shared/plans";

type OrgAdminCreateOptions = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  organizationId?: string;
  planKey?: string;
  seatsLimit?: number;
  documentsLimit?: number;
  nonInteractive?: boolean;
};

async function ensureOrganization(orgId?: string, nonInteractive = false) {
  const organizationId =
    orgId && orgId.trim().length
      ? orgId.trim()
      : nonInteractive
        ? (() => {
            throw new Error("--org is required in non-interactive mode.");
          })()
        : await prompt("Organization ID");

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, billing_plan, seats_limit, documents_limit")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`Organization ${organizationId} not found.`);
  }

  return data;
}

function parseNumericOverride(value?: string | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.toString().trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value "${value}".`);
  }
  return parsed;
}

export async function createOrgAdmin(args: CLIArgs) {
  const options: OrgAdminCreateOptions = {
    email: typeof args.email === "string" ? args.email : undefined,
    password: typeof args.password === "string" ? args.password : undefined,
    firstName:
      typeof args["first-name"] === "string" ? args["first-name"] : undefined,
    lastName:
      typeof args["last-name"] === "string" ? args["last-name"] : undefined,
    company: typeof args.company === "string" ? args.company : undefined,
    organizationId:
      typeof args.org === "string" ? args.org : undefined,
    planKey: typeof args.plan === "string" ? args.plan : undefined,
    seatsLimit:
      typeof args["seats-limit"] === "string"
        ? parseNumericOverride(args["seats-limit"])
        : undefined,
    documentsLimit:
      typeof args["documents-limit"] === "string"
        ? parseNumericOverride(args["documents-limit"])
        : undefined,
    nonInteractive: Boolean(args["non-interactive"]),
  };

  try {
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

    const organization = await ensureOrganization(
      options.organizationId,
      options.nonInteractive,
    );

    const interactiveMode = isInteractive() && !options.nonInteractive;

    let planKey =
      options.planKey ?? organization.billing_plan ?? "free_trial";

    if (interactiveMode) {
      console.log("Available plans:");
      PLAN_CATALOG.forEach((plan) =>
        console.log(`  - ${plan.key} (${plan.name}) [${plan.billingCycle}]`),
      );
      const answer = await prompt("Plan key", { defaultValue: planKey });
      if (answer && answer.trim().length) {
        planKey = answer.trim();
      }
    }

    const plan = getPlanByKey(planKey);
    if (!plan) {
      const knownPlans = PLAN_CATALOG.map((p) => p.key).join(", ");
      throw new Error(
        `Unknown plan "${planKey}". Known plans: ${knownPlans}.`,
      );
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
        ? organization.name ?? ""
        : await prompt("Company (optional)", {
            defaultValue: organization.name ?? "",
          }));

    let seatsOverride = options.seatsLimit;
    let documentsOverride = options.documentsLimit;

    if (interactiveMode) {
      const seatsAnswer = await prompt(
        `Organization seats limit override (blank for ${plan.quotas.seatsLimit ?? organization.seats_limit ?? "current"})`,
        { defaultValue: seatsOverride?.toString() ?? "" },
      );
      seatsOverride = parseNumericOverride(seatsAnswer);

      const documentsAnswer = await prompt(
        `Organization documents limit override (blank for ${plan.quotas.documentsLimit ?? organization.documents_limit ?? "current"})`,
        { defaultValue: documentsOverride?.toString() ?? "" },
      );
      documentsOverride = parseNumericOverride(documentsAnswer);
    }

    const existingAuth = await findAuthUserByEmail(email);
    if (existingAuth) {
      printError(
        `Auth user with email ${email} already exists. Delete it first or choose another email.`,
      );
      return;
    }

    const creation = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company,
        organization_id: organization.id,
        organization_role: "org_admin",
        is_temporary_password: true,
      },
    });

    if (creation.error || !creation.data?.user) {
      throw creation.error ?? new Error("Failed to create auth user.");
    }

    const authUser = creation.data.user;

    const profileUpsert = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: authUser.id,
          auth_user_id: authUser.id,
          email,
          first_name: firstName ?? "",
          last_name: lastName ?? "",
          company: company ?? organization.name ?? "",
          role: "user",
          is_active: true,
          organization_id: organization.id,
          organization_role: "org_admin",
        },
        { onConflict: "id" },
      )
      .select("id");

    if (profileUpsert.error) {
      await supabase.auth.admin.deleteUser(authUser.id);
      throw profileUpsert.error;
    }

    const usageUpsert = await supabase
      .from("user_usage_stats")
      .upsert(
        {
          user_id: authUser.id,
          organization_id: organization.id,
          contracts_reviewed: 0,
          total_pages_reviewed: 0,
          risk_assessments_completed: 0,
          compliance_checks_completed: 0,
          last_activity: null,
        },
        { onConflict: "user_id" },
      );

    if (usageUpsert.error) {
      await supabase.auth.admin.deleteUser(authUser.id);
      throw usageUpsert.error;
    }

    const planUpsert = await supabase
      .from("user_plans")
      .upsert(
        {
          id: uuid(),
          user_id: authUser.id,
          plan_type: plan.key,
          plan_name: plan.name,
          price: plan.price,
          contracts_limit: plan.quotas.contractsLimit ?? null,
          documents_limit:
            (documentsOverride ?? plan.quotas.documentsLimit) ?? null,
          seats_limit: (seatsOverride ?? plan.quotas.seatsLimit) ?? null,
          contracts_used: 0,
          billing_cycle: plan.billingCycle,
          next_billing_date: null,
          trial_days_remaining:
            plan.billingCycle === "trial"
              ? plan.trialDurationDays ?? plan.quotas.contractsLimit ?? null
              : null,
          features: plan.features,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (planUpsert.error) {
      await supabase.auth.admin.deleteUser(authUser.id);
      throw planUpsert.error;
    }

    const orgUpdates: Record<string, unknown> = {};
    if (organization.billing_plan !== plan.key) {
      orgUpdates.billing_plan = plan.key;
    }

    if (seatsOverride !== undefined) {
      orgUpdates.seats_limit = seatsOverride;
      organization.seats_limit = seatsOverride;
    } else if (
      plan.quotas.seatsLimit !== undefined &&
      plan.quotas.seatsLimit !== organization.seats_limit
    ) {
      orgUpdates.seats_limit = plan.quotas.seatsLimit;
      organization.seats_limit = plan.quotas.seatsLimit ?? organization.seats_limit;
    }

    if (documentsOverride !== undefined) {
      orgUpdates.documents_limit = documentsOverride;
      organization.documents_limit = documentsOverride;
    } else if (
      plan.quotas.documentsLimit !== undefined &&
      plan.quotas.documentsLimit !== organization.documents_limit
    ) {
      orgUpdates.documents_limit = plan.quotas.documentsLimit;
      organization.documents_limit = plan.quotas.documentsLimit ?? organization.documents_limit;
    }

    if (Object.keys(orgUpdates).length > 0) {
      const { error: orgUpdateError } = await supabase
        .from("organizations")
        .update(orgUpdates)
        .eq("id", organization.id);
      if (orgUpdateError) {
        throw orgUpdateError;
      }

      organization.billing_plan = plan.key;
    }

    printSuccess("Organization admin created successfully.");
    console.log(`Email: ${email}`);
    console.log(`Organization: ${organization.name ?? organization.id}`);
    console.log(`Assigned plan: ${plan.key}`);
    if (seatsOverride !== undefined) {
      console.log(`  • Seats limit override: ${seatsOverride}`);
    }
    if (documentsOverride !== undefined) {
      console.log(`  • Documents limit override: ${documentsOverride}`);
    }
    console.log(
      `Temporary password: ${
        password && password.length > 0
          ? "(custom password provided)"
          : finalPassword
      }`,
    );
  } catch (error) {
    printError(
      error instanceof Error
        ? error.message
        : "Failed to create organization admin.",
    );
  }
}

export async function listOrgAdmins(args: CLIArgs) {
  try {
    const orgFilter = typeof args.org === "string" ? args.org : undefined;

    let query = supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, company, organization_id, created_at, organizations(name)")
      .eq("organization_role", "org_admin")
      .order("created_at", { ascending: false });

    if (orgFilter) {
      query = query.eq("organization_id", orgFilter.trim());
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("No organization admins found.");
      return;
    }

    formatTable(
      data.map((row) => ({
        ...row,
        created_at: row.created_at
          ? parseISO(row.created_at).toLocaleString()
          : null,
        organization_name: row.organizations?.name ?? row.organization_id ?? "-",
      })),
      [
        { key: "email", label: "Email" },
        { key: "first_name", label: "First Name" },
        { key: "last_name", label: "Last Name" },
        { key: "organization_name", label: "Organization" },
        { key: "created_at", label: "Created" },
      ],
    );
  } catch (error) {
    printError(
      error instanceof Error
        ? error.message
        : "Failed to list organization admins.",
    );
  }
}

export async function deleteOrgAdmin(args: CLIArgs) {
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

    if (!email) throw new Error("Email is required.");

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("id, auth_user_id, organization_id")
      .eq("email", email)
      .eq("organization_role", "org_admin")
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      const authCandidate = await findAuthUserByEmail(email);
      if (!authCandidate) {
        printError(`No organization admin profile found for ${email}.`);
        return;
      }

      const authDelete = await supabase.auth.admin.deleteUser(authCandidate.id);
      if (authDelete.error) throw authDelete.error;

      printSuccess(
        `Deleted auth user ${email}. (No organization profile was present.)`,
      );
      return;
    }

    const authUserId = profile.auth_user_id ?? profile.id;
    const authDelete = await supabase.auth.admin.deleteUser(authUserId);
    if (authDelete.error) throw authDelete.error;

    const { error: profileDelete } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", profile.id);

    if (profileDelete) throw profileDelete;

    printSuccess(`Deleted organization admin ${email}.`);
  } catch (error) {
    printError(
      error instanceof Error
        ? error.message
        : "Failed to delete organization admin.",
    );
  }
}
