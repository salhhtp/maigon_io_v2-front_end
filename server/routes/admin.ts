import express from "express";
import crypto from "crypto";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import { getUserAccessContextByAuthId } from "../lib/userAccess";
import { bootstrapTrialWorkspaceSampleData } from "../services/trialWorkspaceBootstrap";
import type {
  AdminOrganizationSummary,
  OrgAdminProfileSummary,
  OrgAlertPreferences,
  OrgInviteLinkSummary,
} from "../../shared/api";
import { PLAN_CATALOG, getPlanByKey } from "../../shared/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthorizedAdminRequest extends express.Request {
  maigonAdmin?: {
    authUserId: string;
  };
}

const adminRouter = express.Router();

const APP_BASE_URL = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_ORIGIN ||
  process.env.PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const DEFAULT_INVITE_EXPIRY_DAYS = 14;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

interface ExistingOrganizationAssignment {
  mode: "existing";
  organizationId: string;
  makeOrgAdmin?: boolean;
}

interface NewOrganizationInput {
  mode: "new";
  name: string;
  slug?: string;
  billingPlan?: string;
  seatsLimit?: number;
  documentsLimit?: number;
  makeOrgAdmin?: boolean;
}

interface NoOrganizationInput {
  mode: "none";
}

type OrganizationAssignment =
  | ExistingOrganizationAssignment
  | NewOrganizationInput
  | NoOrganizationInput
  | undefined;

interface CreateUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  planKey: string;
  planOverrides?: {
    contractsLimit?: number;
    documentsLimit?: number;
    seatsLimit?: number;
  };
  organization?: OrganizationAssignment;
}

interface CreateInvitePayload {
  email: string;
  prospectName?: string;
  prospectCompany?: string;
  planKey: string;
  planOverrides?: {
    contractsLimit?: number;
    documentsLimit?: number;
    seatsLimit?: number;
  };
  expiresInDays?: number;
  organizationMode: "existing" | "new" | "none";
  organizationId?: string;
  newOrganization?: {
    name: string;
    slug?: string;
    billingPlan?: string;
    seatsLimit?: number;
    documentsLimit?: number;
  };
  makeOrgAdmin?: boolean;
  sendEmail?: boolean;
  metadata?: Record<string, unknown>;
}

function createInviteToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function mapInviteRowToSummary(row: any): OrgInviteLinkSummary {
  const plan = getPlanByKey(row.plan_key);
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    organizationId: row.organization_id ?? null,
    organizationName: row.organizations?.name ?? null,
    status: row.status,
    planKey: row.plan_key,
    planName: plan?.name ?? row.plan_key,
    planQuota: row.plan_quota ?? {},
    expiresAt: row.expires_at ?? null,
    usedAt: row.used_at ?? null,
    createdAt: row.created_at,
    inviteUrl: `${APP_BASE_URL}/invite/${row.token}`,
    metadata: row.metadata ?? {},
  };
}

async function sendTrialInviteEmail(
  supabase: SupabaseClient,
  params: {
    email: string;
    inviteUrl: string;
    planName: string;
    planKey: string;
    prospectName?: string | null;
    prospectCompany?: string | null;
    expiresAt?: string | null;
  },
): Promise<{ success: boolean; message?: string }> {
  const functionName =
    process.env.SUPABASE_FUNCTION_TRIAL_INVITE ||
    process.env.SENDGRID_TRIAL_INVITE_FUNCTION ||
    "";

  if (!functionName) {
    console.info(
      "[admin] Trial invite email function not configured; manual send required",
      {
        email: params.email,
        inviteUrl: params.inviteUrl,
      },
    );

    return {
      success: false,
      message: "Email function not configured",
    };
  }

  try {
    const { error } = await supabase.functions.invoke(functionName, {
      body: {
        to: params.email,
        inviteUrl: params.inviteUrl,
        prospectName: params.prospectName ?? null,
        prospectCompany: params.prospectCompany ?? null,
        planName: params.planName,
        planKey: params.planKey,
        expiresAt: params.expiresAt ?? null,
      },
    });

    if (error) {
      console.error("[admin] Failed to dispatch invite email", error);
      return {
        success: false,
        message: error.message ?? "Failed to dispatch invite email",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[admin] Unexpected invite email failure", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unexpected invite email error",
    };
  }
}

function buildAlertPreferences(row: any | null): OrgAlertPreferences | null {
  if (!row) return null;
  return {
    notifyHighRisk: row.notify_high_risk ?? true,
    notifyPendingEdits: row.notify_pending_edits ?? false,
    alertChannel: row.alert_channel ?? "email",
    lastDigestAt: row.last_digest_at ?? null,
  };
}

async function authorizeAdmin(
  req: AuthorizedAdminRequest,
  res: express.Response,
  next: express.NextFunction,
) {
  const authUserIdRaw =
    req.header("x-auth-user-id") ?? (req.query.authUserId as string | undefined);
  const authUserId = authUserIdRaw?.trim();

  if (!authUserId) {
    res.status(400).json({ error: "authUserId header or query is required" });
    return;
  }

  try {
    const access = await getUserAccessContextByAuthId(authUserId);
    if (!access || !access.isMaigonAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    req.maigonAdmin = { authUserId };
    next();
  } catch (error) {
    console.error("[admin] Authorization failure", error);
    res.status(500).json({ error: "Failed to authorize request" });
  }
}

adminRouter.use(authorizeAdmin);

adminRouter.get("/plan-catalog", (_req, res) => {
  res.json({ plans: PLAN_CATALOG });
});

async function recordAdminActivity(
  adminAuthUserId: string,
  action: string,
  metadata: Record<string, unknown>,
  targetUserId?: string,
) {
  try {
    const supabase = getSupabaseAdminClient();
    await supabase.from("admin_activity_log").insert({
      admin_auth_user_id: adminAuthUserId,
      target_user_id: targetUserId ?? null,
      action,
      metadata,
    });
  } catch (error) {
    console.error("[admin] Failed to record audit log", error);
  }
}

type FetchUsersFilter = {
  ids?: string[];
};

async function fetchAdminUsers(filter: FetchUsersFilter = {}) {
  const supabase = getSupabaseAdminClient();

  const profilesQuery = supabase
    .from("user_profiles")
    .select(
      "id, email, first_name, last_name, company, role, is_active, organization_id, organization_role, created_at",
    )
    .order("created_at", { ascending: false });

  if (filter.ids?.length) {
    profilesQuery.in("id", filter.ids);
  }

  const profilesRes = await profilesQuery;
  if (profilesRes.error) {
    throw profilesRes.error;
  }

  const profiles = profilesRes.data ?? [];
  if (!profiles.length) {
    return [];
  }

  const userIds = profiles.map((profile) => profile.id);

  const [plansRes, usageRes] = await Promise.all([
    supabase
      .from("user_plans")
      .select(
        "id, user_id, plan_type, plan_name, price, contracts_limit, documents_limit, seats_limit, contracts_used, billing_cycle, features, updated_at",
      )
      .in("user_id", userIds),
    supabase
      .from("user_usage_stats")
      .select(
        "user_id, contracts_reviewed, risk_assessments_completed, compliance_checks_completed, last_activity",
      )
      .in("user_id", userIds),
  ]);

  if (plansRes.error) {
    throw plansRes.error;
  }
  if (usageRes.error) {
    throw usageRes.error;
  }

  const plansByUser = new Map<string, any>();
  (plansRes.data ?? []).forEach((planRow) => {
    const existing = plansByUser.get(planRow.user_id);
    if (!existing || new Date(planRow.updated_at ?? planRow.created_at ?? 0) > new Date(existing.updated_at ?? existing.created_at ?? 0)) {
      plansByUser.set(planRow.user_id, planRow);
    }
  });

  const usageByUser = new Map<string, any>();
  (usageRes.data ?? []).forEach((usageRow) => {
    usageByUser.set(usageRow.user_id, usageRow);
  });

  const organizationIds = Array.from(
    new Set(
      profiles
        .map((profile) => profile.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let organizationsMap = new Map<string, { id: string; name: string | null; slug: string | null }>();
  if (organizationIds.length) {
    const orgsRes = await supabase
      .from("organizations")
      .select("id, name, slug")
      .in("id", organizationIds);
    if (orgsRes.error) {
      throw orgsRes.error;
    }
    organizationsMap = new Map(
      (orgsRes.data ?? []).map((org) => [org.id, { id: org.id, name: org.name ?? null, slug: org.slug }]),
    );
  }

  const summaries = profiles.map<AdminUserSummary>((profile) => {
    const planRow = plansByUser.get(profile.id);
    const usageRow = usageByUser.get(profile.id);
    const planDefinition = planRow ? getPlanByKey(planRow.plan_type) : undefined;

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name ?? null,
      lastName: profile.last_name ?? null,
      company: profile.company ?? null,
      role: profile.role === "admin" ? "admin" : profile.organization_role === "org_admin" ? "org_admin" : "user",
      isActive: profile.is_active ?? false,
      createdAt: profile.created_at ?? null,
      organization: profile.organization_id
        ? {
            id: profile.organization_id,
            name: organizationsMap.get(profile.organization_id)?.name ?? "",
            slug: organizationsMap.get(profile.organization_id)?.slug ?? null,
            role: profile.organization_role ?? null,
          }
        : null,
      plan: planRow
        ? {
            key: planRow.plan_type,
            name: planDefinition?.name ?? planRow.plan_name ?? planRow.plan_type,
            price: planRow.price ?? planDefinition?.price ?? 0,
            billingCycle: planRow.billing_cycle,
            quotas: {
              contractsLimit: planRow.contracts_limit ?? planDefinition?.quotas.contractsLimit ?? 0,
              documentsLimit:
                planRow.documents_limit ?? planDefinition?.quotas.documentsLimit,
              seatsLimit: planRow.seats_limit ?? planDefinition?.quotas.seatsLimit,
            },
            updatedAt: planRow.updated_at ?? null,
          }
        : null,
      usage: usageRow
        ? {
            contractsReviewed: usageRow.contracts_reviewed ?? 0,
            riskAssessmentsCompleted: usageRow.risk_assessments_completed ?? 0,
            complianceChecksCompleted:
              usageRow.compliance_checks_completed ?? 0,
            lastActivity: usageRow.last_activity ?? null,
          }
        : null,
    };
  });

  return summaries;
}

adminRouter.get("/users", async (_req, res) => {
  try {
    const users = await fetchAdminUsers();
    res.json({ users });
  } catch (error) {
    console.error("[admin] Failed to list users", error);
    res.status(500).json({ error: "Failed to list users" });
  }
});

adminRouter.get("/invite-links", async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("org_invite_links")
      .select(
        "id, token, email, organization_id, plan_key, plan_quota, status, expires_at, used_at, created_at, created_by_auth_user, metadata, organizations:organization_id(name)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const invites = (data ?? []).map(mapInviteRowToSummary);
    res.json({ invites });
  } catch (error) {
    console.error("[admin] Failed to list invite links", error);
    res.status(500).json({ error: "Failed to list invite links" });
  }
});

adminRouter.post(
  "/invite-links",
  async (req: AuthorizedAdminRequest, res: express.Response) => {
    const payload = req.body as CreateInvitePayload;
    const supabase = getSupabaseAdminClient();

    const normalizedEmail =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      res.status(400).json({ error: "Prospect email is required" });
      return;
    }

    const plan = getPlanByKey(payload.planKey);
    if (!plan) {
      res.status(400).json({ error: "Unknown plan key" });
      return;
    }

    const planQuota = {
      contractsLimit:
        payload.planOverrides?.contractsLimit ?? plan.quotas.contractsLimit,
      documentsLimit:
        payload.planOverrides?.documentsLimit ??
        (plan.quotas.documentsLimit ?? null),
      seatsLimit:
        payload.planOverrides?.seatsLimit ?? (plan.quotas.seatsLimit ?? null),
    };

    let metadata: Record<string, unknown> = {
      prospectName: payload.prospectName ?? null,
      prospectCompany: payload.prospectCompany ?? null,
      organizationMode: payload.organizationMode,
      makeOrgAdmin: payload.makeOrgAdmin ?? false,
      planOverrides: payload.planOverrides ?? null,
      sendEmailRequested: Boolean(payload.sendEmail),
    };

    let organizationId: string | null = null;
    let newOrganizationCreated = false;
    let bootstrapResult: Awaited<
      ReturnType<typeof bootstrapTrialWorkspaceSampleData>
    > | null = null;

    try {
      if (payload.organizationMode === "existing") {
        if (!payload.organizationId) {
          res
            .status(400)
            .json({ error: "organizationId is required for existing mode" });
          return;
        }

        const existingOrg = await supabase
          .from("organizations")
          .select("id, name, slug, metadata")
          .eq("id", payload.organizationId)
          .maybeSingle();

        if (existingOrg.error) {
          throw existingOrg.error;
        }

        if (!existingOrg.data) {
          res.status(404).json({ error: "Organization not found" });
          return;
        }

        organizationId = existingOrg.data.id;
        metadata = {
          ...metadata,
          organizationId,
          organizationSlug: existingOrg.data.slug ?? null,
        };
      } else if (payload.organizationMode === "new") {
        const newOrgInput = payload.newOrganization;
        if (!newOrgInput || typeof newOrgInput.name !== "string") {
          res
            .status(400)
            .json({ error: "newOrganization.name is required for new mode" });
          return;
        }

        const baseSlug = slugify(
          newOrgInput.slug && newOrgInput.slug.trim()
            ? newOrgInput.slug
            : newOrgInput.name,
        );
        const randomSuffix = crypto.randomUUID().slice(0, 6);
        const finalSlug = `${baseSlug}-${randomSuffix}`.slice(0, 60);

        const seatsLimit =
          typeof newOrgInput.seatsLimit === "number"
            ? Math.max(1, Math.floor(newOrgInput.seatsLimit))
            : typeof planQuota.seatsLimit === "number"
              ? planQuota.seatsLimit
              : plan.quotas.seatsLimit ?? 10;

        const documentsLimit =
          typeof newOrgInput.documentsLimit === "number"
            ? Math.max(10, Math.floor(newOrgInput.documentsLimit))
            : typeof planQuota.documentsLimit === "number"
              ? planQuota.documentsLimit
              : plan.quotas.documentsLimit ?? 1000;

        const organizationMetadata = {
          trial_onboarding: {
            source: "prospect_invite",
            createdAt: new Date().toISOString(),
            planKey: plan.key,
            quotas: planQuota,
            prospectEmail: normalizedEmail,
            prospectCompany: payload.prospectCompany ?? null,
          },
        };

        const createdOrg = await supabase
          .from("organizations")
          .insert({
            name: newOrgInput.name.trim(),
            slug: finalSlug,
            billing_plan:
              typeof newOrgInput.billingPlan === "string"
                ? newOrgInput.billingPlan
                : plan.key,
            seats_limit: seatsLimit,
            documents_limit: documentsLimit,
            metadata: organizationMetadata,
          })
          .select("id, name, slug")
          .single();

        if (createdOrg.error) {
          throw createdOrg.error;
        }

        organizationId = createdOrg.data.id;
        newOrganizationCreated = true;

        await supabase
          .from("organization_alert_preferences")
          .upsert(
            { organization_id: organizationId },
            { onConflict: "organization_id", ignoreDuplicates: true },
          );

        const organizationName = createdOrg.data.name;
        bootstrapResult = await bootstrapTrialWorkspaceSampleData({
          supabase,
          organizationId,
          organizationName,
        });

        metadata = {
          ...metadata,
          organizationId,
          organizationSlug: createdOrg.data.slug ?? null,
          bootstrap: bootstrapResult,
        };
      } else if (payload.organizationMode === "none") {
        organizationId = null;
        metadata = {
          ...metadata,
          organizationId: null,
        };
      } else {
        res.status(400).json({ error: "Invalid organization mode" });
        return;
      }

      const expiresInDays =
        typeof payload.expiresInDays === "number" && payload.expiresInDays > 0
          ? Math.floor(payload.expiresInDays)
          : DEFAULT_INVITE_EXPIRY_DAYS;

      const expiresAt = new Date(
        Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      );
      const token = createInviteToken();

      const inviteInsert = await supabase
        .from("org_invite_links")
        .insert({
          token,
          email: normalizedEmail,
          organization_id: organizationId,
          plan_key: plan.key,
          plan_quota: planQuota,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          created_by_auth_user: req.maigonAdmin?.authUserId ?? null,
          metadata,
        })
        .select(
          "id, token, email, organization_id, plan_key, plan_quota, status, expires_at, used_at, created_at, created_by_auth_user, metadata, organizations:organization_id(name)",
        )
        .single();

      if (inviteInsert.error) {
        throw inviteInsert.error;
      }

      const inviteRow = inviteInsert.data;

      if (payload.sendEmail) {
        const dispatchResult = await sendTrialInviteEmail(supabase, {
          email: normalizedEmail,
          inviteUrl: `${APP_BASE_URL}/invite/${inviteRow.token}`,
          planName: plan.name,
          planKey: plan.key,
          prospectName: payload.prospectName ?? null,
          prospectCompany: payload.prospectCompany ?? null,
          expiresAt: inviteRow.expires_at ?? null,
        });

        const nextMetadata = {
          ...(inviteRow.metadata ?? {}),
          emailDispatch: {
            requestedAt: new Date().toISOString(),
            success: dispatchResult.success,
            message: dispatchResult.message ?? null,
          },
        };

        await supabase
          .from("org_invite_links")
          .update({ metadata: nextMetadata })
          .eq("id", inviteRow.id);

        inviteRow.metadata = nextMetadata;
      }

      const inviteSummary = mapInviteRowToSummary(inviteRow);

      res.status(201).json({
        invite: inviteSummary,
        organizationId,
        organizationCreated: newOrganizationCreated,
        bootstrap: bootstrapResult,
      });

      if (req.maigonAdmin) {
        await recordAdminActivity(req.maigonAdmin.authUserId, "create_invite_link", {
          inviteId: inviteRow.id,
          email: normalizedEmail,
          organizationId,
          organizationCreated: newOrganizationCreated,
          planKey: plan.key,
          organizationMode: payload.organizationMode,
        });
      }
    } catch (error) {
      console.error("[admin] Failed to create invite link", error);
      res.status(500).json({ error: "Failed to create invite link" });
    }
  },
);

async function buildOrganizationSummaries(
  organizationIds: string[],
) {
  if (!organizationIds.length) return [] as AdminOrganizationSummary[];

  const supabase = getSupabaseAdminClient();

  const [orgsRes, profilesRes, contractsRes, prefsRes] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, billing_plan, seats_limit, documents_limit, metadata, created_at",
      )
      .in("id", organizationIds),
    supabase
      .from("user_profiles")
      .select(
        "id, email, first_name, last_name, organization_id, organization_role",
      )
      .in("organization_id", organizationIds),
    supabase
      .from("contracts")
      .select("id, organization_id")
      .in("organization_id", organizationIds),
    supabase
      .from("organization_alert_preferences")
      .select(
        "organization_id, notify_high_risk, notify_pending_edits, alert_channel, last_digest_at",
      )
      .in("organization_id", organizationIds),
  ]);

  const errors = [orgsRes.error, profilesRes.error, contractsRes.error, prefsRes.error].filter(
    Boolean,
  );
  if (errors.length) {
    throw errors[0];
  }

  const orgs = orgsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const contracts = contractsRes.data ?? [];
  const prefs = prefsRes.data ?? [];

  const profileByOrg = new Map<string, any[]>();
  profiles.forEach((profile) => {
    if (!profile.organization_id) return;
    const bucket = profileByOrg.get(profile.organization_id) ?? [];
    bucket.push(profile);
    profileByOrg.set(profile.organization_id, bucket);
  });

  const contractCountByOrg = new Map<string, number>();
  contracts.forEach((contract) => {
    if (!contract.organization_id) return;
    contractCountByOrg.set(
      contract.organization_id,
      (contractCountByOrg.get(contract.organization_id) ?? 0) + 1,
    );
  });

  const prefsByOrg = new Map<string, OrgAlertPreferences>();
  prefs.forEach((row) => {
    prefsByOrg.set(row.organization_id, buildAlertPreferences(row)!);
  });

  const summaries: AdminOrganizationSummary[] = orgs.map((org) => {
    const bucket = profileByOrg.get(org.id) ?? [];
    const admins = bucket
      .filter((profile) => profile.organization_role === "org_admin")
      .map((profile) => {
        const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`
          .trim()
          .replace(/\s+/g, " ");
        return {
          id: profile.id,
          email: profile.email,
          name: name || profile.email,
        } satisfies OrgAdminProfileSummary;
      });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      billingPlan: org.billing_plan,
      seatsLimit: org.seats_limit,
      seatsUsed: bucket.length,
      documentsLimit: org.documents_limit,
      documentsUsed: contractCountByOrg.get(org.id) ?? 0,
      alertPreferences: prefsByOrg.get(org.id) ?? null,
      admins,
      createdAt: org.created_at,
    } satisfies AdminOrganizationSummary;
  });

  return summaries;
}

adminRouter.get("/orgs", async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const organizationIds = (data ?? []).map((row) => row.id);
    const summaries = await buildOrganizationSummaries(organizationIds);

    res.json({ organizations: summaries, count: summaries.length });
  } catch (error) {
    console.error("[admin] Failed to list organizations", error);
    res.status(500).json({ error: "Failed to list organizations" });
  }
});

adminRouter.post("/orgs", async (req, res) => {
  const { name, slug, billingPlan, seatsLimit, documentsLimit, metadata } =
    req.body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Organization name is required" });
    return;
  }

  const supabase = getSupabaseAdminClient();
  const finalSlug = (slug && typeof slug === "string" ? slug : slugify(name)).slice(0, 60);

  try {
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        slug: finalSlug,
        billing_plan: typeof billingPlan === "string" ? billingPlan : "standard",
        seats_limit:
          typeof seatsLimit === "number" && seatsLimit > 0 ? Math.floor(seatsLimit) : 10,
        documents_limit:
          typeof documentsLimit === "number" && documentsLimit > 0
            ? Math.floor(documentsLimit)
            : 1000,
        metadata:
          metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {},
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    // Ensure alert preferences row exists
    await getSupabaseAdminClient()
      .from("organization_alert_preferences")
      .upsert(
        { organization_id: data.id },
        { onConflict: "organization_id", ignoreDuplicates: true },
      );

    const summaries = await buildOrganizationSummaries([data.id]);
    res.status(201).json({ organization: summaries[0] });
  } catch (error) {
    console.error("[admin] Failed to create organization", error);
    res.status(500).json({ error: "Failed to create organization" });
  }
});

adminRouter.patch("/orgs/:id", async (req, res) => {
  const organizationId = req.params.id;
  const { billingPlan, seatsLimit, documentsLimit, metadata } =
    req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof billingPlan === "string") {
    updates.billing_plan = billingPlan;
  }
  if (typeof seatsLimit === "number" && seatsLimit > 0) {
    updates.seats_limit = Math.floor(seatsLimit);
  }
  if (typeof documentsLimit === "number" && documentsLimit > 0) {
    updates.documents_limit = Math.floor(documentsLimit);
  }
  if (metadata && typeof metadata === "object") {
    updates.metadata = metadata;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", organizationId);

    if (error) {
      throw error;
    }

    const summaries = await buildOrganizationSummaries([organizationId]);
    if (!summaries.length) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json({ organization: summaries[0] });
  } catch (error) {
    console.error("[admin] Failed to update organization", error);
    res.status(500).json({ error: "Failed to update organization" });
  }
});

function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString("base64url").slice(0, 16);
}

adminRouter.post("/orgs/:id/assign-admin", async (req, res) => {
  const organizationId = req.params.id;
  const {
    email,
    firstName,
    lastName,
    createIfMissing = false,
  } = (req.body as Record<string, unknown>) ?? {};

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();

  try {
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from("user_profiles")
        .update({
          organization_id: organizationId,
          organization_role: "org_admin",
          is_active: true,
        })
        .eq("id", existingProfile.id)
        .select("id, email, first_name, last_name")
        .single();

      if (updateError) {
        throw updateError;
      }

      res.json({
        created: false,
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          name: `${updatedProfile.first_name ?? ""} ${updatedProfile.last_name ?? ""}`.trim(),
        },
      });
      return;
    }

    if (!createIfMissing) {
      res.status(404).json({
        error: "User not found",
        details: "Set createIfMissing to true to create and invite the admin",
      });
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: typeof firstName === "string" ? firstName : "",
        last_name: typeof lastName === "string" ? lastName : "",
        role: "user",
      },
    });

    if (authError) {
      throw authError;
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUser.user.id,
        auth_user_id: authUser.user.id,
        email: normalizedEmail,
        first_name: typeof firstName === "string" ? firstName : "",
        last_name: typeof lastName === "string" ? lastName : "",
        company: "",
        role: "user",
        is_active: true,
        organization_id: organizationId,
        organization_role: "org_admin",
      })
      .select("id, email, first_name, last_name")
      .single();

    if (profileError) {
      throw profileError;
    }

    res.status(201).json({
      created: true,
      temporaryPassword,
      user: {
        id: profile.id,
        email: profile.email,
        name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      },
    });
  } catch (error) {
    console.error("[admin] Failed to assign org admin", error);
    res.status(500).json({ error: "Failed to assign organization admin" });
  }
});

adminRouter.post("/users", async (req, res) => {
  const payload = req.body as CreateUserPayload | undefined;

  if (!payload || typeof payload.email !== "string" || !payload.email.trim()) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  if (!payload.planKey || typeof payload.planKey !== "string") {
    res.status(400).json({ error: "planKey is required" });
    return;
  }

  const plan = getPlanByKey(payload.planKey);
  if (!plan) {
    res.status(400).json({ error: "Unknown plan key" });
    return;
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();

  try {
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      res.status(409).json({
        error: "User already exists",
        details: "A profile with this email is already registered",
      });
      return;
    }

    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      email: normalizedEmail,
    });

    const existingAuth = existingUsers?.users?.find(
      (user: any) => user.email === normalizedEmail,
    );

    if (existingAuth) {
      res.status(409).json({
        error: "Auth user already exists",
        details: "Remove or reuse the existing account before provisioning",
      });
      return;
    }

    let organizationId: string | null = null;
    let organizationRole: "org_admin" | "member" | null = null;

    if (payload.organization && payload.organization.mode === "existing") {
      organizationId = payload.organization.organizationId;
      organizationRole = payload.organization.makeOrgAdmin ? "org_admin" : "member";
    } else if (payload.organization && payload.organization.mode === "new") {
      const newOrgPayload = payload.organization;
      const { data: createdOrg, error: createOrgError } = await supabase
        .from("organizations")
        .insert({
          name: newOrgPayload.name.trim(),
          slug: (newOrgPayload.slug && newOrgPayload.slug.trim()) || slugify(newOrgPayload.name),
          billing_plan: newOrgPayload.billingPlan || plan.key,
          seats_limit:
            typeof newOrgPayload.seatsLimit === "number"
              ? Math.max(1, Math.floor(newOrgPayload.seatsLimit))
              : plan.quotas.seatsLimit ?? 10,
          documents_limit:
            typeof newOrgPayload.documentsLimit === "number"
              ? Math.max(10, Math.floor(newOrgPayload.documentsLimit))
              : plan.quotas.documentsLimit ?? 1000,
          metadata: {},
        })
        .select("id")
        .single();

      if (createOrgError) {
        throw createOrgError;
      }

      organizationId = createdOrg.id;
      organizationRole = newOrgPayload.makeOrgAdmin ? "org_admin" : "member";

      await supabase
        .from("organization_alert_preferences")
        .upsert(
          { organization_id: organizationId },
          { onConflict: "organization_id", ignoreDuplicates: true },
        );
    }

    const temporaryPassword = generateTemporaryPassword();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: payload.firstName ?? "",
        last_name: payload.lastName ?? "",
        company: payload.company ?? "",
        role: "user",
      },
    });

    if (authError) {
      throw authError;
    }

    const authUserId = authUser.user.id;

    const profileInsert = await supabase
      .from("user_profiles")
      .insert({
        id: authUserId,
        auth_user_id: authUserId,
        email: normalizedEmail,
        first_name: payload.firstName ?? "",
        last_name: payload.lastName ?? "",
        company: payload.company ?? "",
        role: "user",
        is_active: true,
        organization_id: organizationId,
        organization_role: organizationId ? organizationRole ?? "member" : null,
      })
      .select("id, email, first_name, last_name, organization_id, organization_role")
      .single();

    if (profileInsert.error) {
      await supabase.auth.admin.deleteUser(authUserId);
      throw profileInsert.error;
    }

    const quotas = {
      contractsLimit:
        payload.planOverrides?.contractsLimit ?? plan.quotas.contractsLimit,
      seatsLimit:
        payload.planOverrides?.seatsLimit ?? plan.quotas.seatsLimit,
      documentsLimit:
        payload.planOverrides?.documentsLimit ?? plan.quotas.documentsLimit,
    };

    const usageInsert = await supabase.from("user_usage_stats").insert({
      user_id: authUserId,
      contracts_reviewed: 0,
      total_pages_reviewed: 0,
      risk_assessments_completed: 0,
      compliance_checks_completed: 0,
      last_activity: null,
    });

    if (usageInsert.error) {
      await supabase.auth.admin.deleteUser(authUserId);
      throw usageInsert.error;
    }

    const planInsert = await supabase.from("user_plans").insert({
      id: crypto.randomUUID(),
      user_id: authUserId,
      plan_type: plan.key,
      plan_name: plan.name,
      price: plan.price,
      contracts_limit: quotas.contractsLimit,
      documents_limit: quotas.documentsLimit ?? null,
      seats_limit: quotas.seatsLimit ?? null,
      contracts_used: 0,
      billing_cycle: plan.billingCycle,
      next_billing_date: null,
      trial_days_remaining:
        plan.billingCycle === "trial"
          ? plan.trialDurationDays ?? quotas.contractsLimit
          : null,
      features: plan.features,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (planInsert.error) {
      await supabase.auth.admin.deleteUser(authUserId);
      throw planInsert.error;
    }

    res.status(201).json({
      user: {
        id: profileInsert.data.id,
        email: profileInsert.data.email,
        firstName: profileInsert.data.first_name,
        lastName: profileInsert.data.last_name,
        organizationId,
        organizationRole: profileInsert.data.organization_role,
      },
      plan: {
        key: plan.key,
        name: plan.name,
        quotas,
      },
      temporaryPassword,
    });

    if (req.maigonAdmin) {
      await recordAdminActivity(req.maigonAdmin.authUserId, "create_user", {
        email: profileInsert.data.email,
        plan: plan.key,
        organizationId,
      }, profileInsert.data.id);
    }
  } catch (error) {
    console.error("[admin] Failed to create user", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

adminRouter.patch("/users/:id", async (req, res) => {
  const userId = req.params.id;
  const updates = req.body as Partial<{
    isActive: boolean;
    planKey: string;
    planOverrides: {
      contractsLimit?: number;
      documentsLimit?: number;
      seatsLimit?: number;
    };
    organizationId: string | null;
    organizationRole: "member" | "org_admin" | null;
  }>;

  if (!updates || Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No update payload provided" });
    return;
  }

  const supabase = getSupabaseAdminClient();

  try {
    if (Object.prototype.hasOwnProperty.call(updates, "isActive")) {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_active: updates.isActive })
        .eq("id", userId);
      if (error) throw error;
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "organizationId") ||
      Object.prototype.hasOwnProperty.call(updates, "organizationRole")
    ) {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          organization_id:
            updates.organizationId === undefined ? undefined : updates.organizationId,
          organization_role:
            updates.organizationId
              ? updates.organizationRole ?? "member"
              : updates.organizationId === null
                ? null
                : undefined,
        })
        .eq("id", userId);
      if (error) throw error;
    }

    if (updates.planKey) {
      const plan = getPlanByKey(updates.planKey);
      if (!plan) {
        res.status(400).json({ error: "Unknown plan key" });
        return;
      }

      const quotas = {
        contractsLimit:
          updates.planOverrides?.contractsLimit ?? plan.quotas.contractsLimit,
        documentsLimit:
          updates.planOverrides?.documentsLimit ?? plan.quotas.documentsLimit,
        seatsLimit: updates.planOverrides?.seatsLimit ?? plan.quotas.seatsLimit,
      };

      const { data: existingPlan, error: existingPlanError } = await supabase
        .from("user_plans")
        .select("id, contracts_used, created_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingPlanError) throw existingPlanError;

      const planPayload = {
        id: existingPlan?.id ?? crypto.randomUUID(),
        user_id: userId,
        plan_type: plan.key,
        plan_name: plan.name,
        price: plan.price,
        contracts_limit: quotas.contractsLimit,
        documents_limit: quotas.documentsLimit ?? null,
        seats_limit: quotas.seatsLimit ?? null,
        contracts_used: existingPlan?.contracts_used ?? 0,
        billing_cycle: plan.billingCycle,
        features: plan.features,
        created_at: existingPlan?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("user_plans")
        .upsert(planPayload, { onConflict: "id" });
      if (upsertError) throw upsertError;
    }

    const [userSummary] = await fetchAdminUsers({ ids: [userId] });
    if (!userSummary) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (req.maigonAdmin) {
      await recordAdminActivity(
        req.maigonAdmin.authUserId,
        "update_user",
        {
          planKey: updates.planKey,
          organizationId: updates.organizationId,
          isActive: updates.isActive,
        },
        userId,
      );
    }

    res.json({ user: userSummary });
  } catch (error) {
    console.error("[admin] Failed to update user", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

adminRouter.post("/users/:id/reset-password", async (req, res) => {
  const userId = req.params.id;
  const supabase = getSupabaseAdminClient();

  try {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        password: temporaryPassword,
        email_confirm: true,
      },
    );

    if (updateError) {
      throw updateError;
    }

    if (req.maigonAdmin) {
      await recordAdminActivity(
        req.maigonAdmin.authUserId,
        "reset_password",
        { email: profile.email },
        userId,
      );
    }

    res.json({ temporaryPassword });
  } catch (error) {
    console.error("[admin] Failed to reset password", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export { adminRouter };
