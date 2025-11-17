import express from "express";
import crypto from "crypto";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import { getPlanByKey } from "../../shared/plans";
import type {
  InviteAcceptanceRequest,
  InviteAcceptanceResponse,
  InviteTokenSummary,
  InviteTokenType,
} from "../../shared/api";
import type { SupabaseClient } from "@supabase/supabase-js";

const publicRouter = express.Router();

type InviteRow = {
  id: string;
  token: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  plan_key: string;
  plan_quota?: unknown;
  expires_at?: string | null;
  used_at?: string | null;
  organization_id?: string | null;
  metadata?: unknown;
  created_by_auth_user?: string | null;
  organizations?: { name?: string | null } | null;
};

type MemberInviteRow = {
  id: string;
  token: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  organization_id: string;
  organization_role?: "member" | "org_admin" | null;
  expires_at?: string | null;
  used_at?: string | null;
  metadata?: unknown;
  invited_by_profile?: {
    id?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  organizations?: {
    id?: string;
    name?: string | null;
    billing_plan?: string | null;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePlanQuota(row: InviteRow) {
  const plan = getPlanByKey(row.plan_key);
  const quotaSource = isRecord(row.plan_quota) ? row.plan_quota : {};
  return {
    contractsLimit:
      typeof quotaSource.contractsLimit === "number"
        ? quotaSource.contractsLimit
        : plan?.quotas.contractsLimit ?? null,
    documentsLimit:
      typeof quotaSource.documentsLimit === "number"
        ? quotaSource.documentsLimit
        : plan?.quotas.documentsLimit ?? null,
    seatsLimit:
      typeof quotaSource.seatsLimit === "number"
        ? quotaSource.seatsLimit
        : plan?.quotas.seatsLimit ?? null,
  };
}

function buildInviteSummary(row: InviteRow): InviteTokenSummary {
  const plan = getPlanByKey(row.plan_key);
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const planQuota = resolvePlanQuota(row);

  return {
    inviteType: "org_trial",
    email: row.email,
    planKey: row.plan_key,
    planName: plan?.name ?? row.plan_key,
    planQuota,
    organizationId: row.organization_id ?? null,
    organizationName: row.organizations?.name ?? null,
    organizationRole:
      metadata.makeOrgAdmin === true || metadata.makeOrgAdmin === "true"
        ? "org_admin"
        : metadata.makeOrgAdmin === false
          ? "member"
          : null,
    status: row.status,
    expiresAt: row.expires_at ?? null,
    prospectName:
      typeof metadata.prospectName === "string" ? metadata.prospectName : null,
    prospectCompany:
      typeof metadata.prospectCompany === "string"
        ? metadata.prospectCompany
        : null,
    makeOrgAdmin:
      metadata.makeOrgAdmin === true ||
      metadata.makeOrgAdmin === "true" ||
      metadata.makeOrgAdmin === 1,
  };
}

function buildMemberInviteSummary(row: MemberInviteRow): InviteTokenSummary {
  const organizationRole =
    row.organization_role === "org_admin" ? "org_admin" : "member";
  const planKeyRaw = row.organizations?.billing_plan ?? null;
  const plan = planKeyRaw ? getPlanByKey(planKeyRaw) : undefined;

  return {
    inviteType: "org_member",
    email: row.email,
    planKey: plan?.key ?? planKeyRaw,
    planName: plan?.name ?? planKeyRaw,
    planQuota: plan ? plan.quotas : null,
    organizationId: row.organization_id,
    organizationName: row.organizations?.name ?? null,
    organizationRole,
    status: row.status,
    expiresAt: row.expires_at ?? null,
    makeOrgAdmin: organizationRole === "org_admin",
  };
}

type PublicInviteRecord =
  | { type: "org_trial"; invite: InviteRow }
  | { type: "org_member"; invite: MemberInviteRow };

async function fetchInviteByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<PublicInviteRecord | null> {
  const trialResponse = await supabase
    .from("org_invite_links")
    .select(
      "id, token, email, status, plan_key, plan_quota, expires_at, used_at, organization_id, metadata, created_by_auth_user, organizations:organization_id(name)",
    )
    .eq("token", token)
    .maybeSingle<InviteRow>();

  if (trialResponse.error) {
    throw trialResponse.error;
  }

  if (trialResponse.data) {
    return { type: "org_trial", invite: trialResponse.data };
  }

  const memberResponse = await supabase
    .from("org_member_invites")
    .select(
      "id, token, email, status, organization_id, organization_role, expires_at, used_at, metadata, invited_by_profile:invited_by_profile(id, email, first_name, last_name), organizations:organization_id(id, name, billing_plan)",
    )
    .eq("token", token)
    .maybeSingle<MemberInviteRow>();

  if (memberResponse.error) {
    throw memberResponse.error;
  }

  if (memberResponse.data) {
    return { type: "org_member", invite: memberResponse.data };
  }

  return null;
}

async function markTrialInviteExpired(
  supabase: SupabaseClient,
  inviteId: string,
) {
  await supabase
    .from("org_invite_links")
    .update({ status: "expired" })
    .eq("id", inviteId)
    .eq("status", "pending");
}

async function markMemberInviteExpired(
  supabase: SupabaseClient,
  inviteId: string,
) {
  await supabase
    .from("org_member_invites")
    .update({ status: "expired" })
    .eq("id", inviteId)
    .eq("status", "pending");
}

async function logInviteAcceptance(
  supabase: SupabaseClient,
  options: {
    adminAuthUserId: string | null;
    targetUserId: string;
    inviteId: string;
    organizationId: string | null;
    planKey: string | null;
    inviteType: InviteTokenType;
  },
) {
  try {
    await supabase.from("admin_activity_log").insert({
      admin_auth_user_id: options.adminAuthUserId,
      target_user_id: options.targetUserId,
      action: "invite_link_accepted",
      metadata: {
        inviteId: options.inviteId,
        organizationId: options.organizationId,
        planKey: options.planKey,
        inviteType: options.inviteType,
      },
    });
  } catch (error) {
    console.error("[public] Failed to record invite acceptance audit log", error);
  }
}

publicRouter.get(
  "/invite/:token",
  async (req: express.Request, res: express.Response) => {
    const token = (req.params.token ?? "").trim();
    if (!token) {
      res.status(400).json({ error: "Invite token is required" });
      return;
    }

    const supabase = getSupabaseAdminClient();

    try {
      const record = await fetchInviteByToken(supabase, token);
      if (!record) {
        res.status(404).json({ error: "Invite not found" });
        return;
      }

      let summary: InviteTokenSummary | null = null;

      if (record.type === "org_trial") {
        const invite = record.invite;
        let status = invite.status;
        if (
          status === "pending" &&
          invite.expires_at &&
          new Date(invite.expires_at).getTime() < Date.now()
        ) {
          status = "expired";
          await markTrialInviteExpired(supabase, invite.id);
          invite.status = "expired";
        }

        summary = buildInviteSummary(invite);
      } else {
        const invite = record.invite;
        let status = invite.status;
        if (
          status === "pending" &&
          invite.expires_at &&
          new Date(invite.expires_at).getTime() < Date.now()
        ) {
          status = "expired";
          await markMemberInviteExpired(supabase, invite.id);
          invite.status = "expired";
        }

        summary = buildMemberInviteSummary(invite);
      }

      if (!summary) {
        res.status(500).json({ error: "Failed to build invite summary" });
        return;
      }
      res.json({ invite: summary });
    } catch (error) {
      console.error("[public] Failed to lookup invite token", error);
      res.status(500).json({ error: "Failed to lookup invite" });
    }
  },
);

publicRouter.post(
  "/invite/:token/accept",
  async (req: express.Request, res: express.Response) => {
    const token = (req.params.token ?? "").trim();
    if (!token) {
      res.status(400).json({ error: "Invite token is required" });
      return;
    }

    const payload = req.body as InviteAcceptanceRequest;
    if (
      !payload ||
      typeof payload.password !== "string" ||
      payload.password.length < 10 ||
      typeof payload.firstName !== "string" ||
      typeof payload.lastName !== "string"
    ) {
      res.status(400).json({
        error:
          "Missing or invalid acceptance payload. Password must be at least 10 characters.",
      });
      return;
    }

    const supabase = getSupabaseAdminClient();

    const handleTrialAcceptance = async (invite: InviteRow) => {
      if (
        invite.status !== "pending" ||
        (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now())
      ) {
        if (invite.status === "pending") {
          await markTrialInviteExpired(supabase, invite.id);
        }
        res.status(410).json({ error: "Invite link is no longer valid" });
        return;
      }

      const metadata = isRecord(invite.metadata) ? invite.metadata : {};
      const normalizedEmail = invite.email.trim().toLowerCase();

      const existingProfiles = await supabase
        .from("user_profiles")
        .select("id, auth_user_id")
        .eq("email", normalizedEmail)
        .limit(1);

      if (existingProfiles.error) {
        throw existingProfiles.error;
      }

      const existingProfile = existingProfiles.data?.[0];
      if (existingProfile) {
        const message = existingProfile.auth_user_id
          ? "Account already exists for this email"
          : "A pending profile already exists for this email. Please contact support to finalize onboarding.";
        res.status(409).json({ error: message });
        return;
      }

      const existingUsers = await supabase.auth.admin.listUsers({
        email: normalizedEmail,
      });

      const authExists =
        existingUsers?.users?.some(
          (user: any) => user.email?.toLowerCase() === normalizedEmail,
        ) ?? false;

      if (authExists) {
        res.status(409).json({
          error: "A Supabase auth user already exists for this email",
        });
        return;
      }

      const plan = getPlanByKey(invite.plan_key);
      const planQuota = resolvePlanQuota(invite);

      const createUserResult = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          first_name: payload.firstName ?? "",
          last_name: payload.lastName ?? "",
          company:
            payload.company ??
            (typeof metadata.prospectCompany === "string"
              ? metadata.prospectCompany
              : ""),
          role: "user",
        },
      });

      if (createUserResult.error) {
        throw createUserResult.error;
      }

      const authUserId = createUserResult.user.id;

      const cleanup = async () => {
        await supabase.from("user_profiles").delete().eq("id", authUserId);
        await supabase
          .from("user_usage_stats")
          .delete()
          .eq("user_id", authUserId);
        await supabase.from("user_plans").delete().eq("user_id", authUserId);
        await supabase.auth.admin.deleteUser(authUserId);
      };

      const makeOrgAdmin =
        metadata.makeOrgAdmin === true ||
        metadata.makeOrgAdmin === "true" ||
        metadata.makeOrgAdmin === 1;

      const organizationRole = invite.organization_id
        ? makeOrgAdmin
          ? "org_admin"
          : "member"
        : null;

      const profileInsert = await supabase
        .from("user_profiles")
        .insert({
          id: authUserId,
          auth_user_id: authUserId,
          email: normalizedEmail,
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          company:
            payload.company ??
            (typeof metadata.prospectCompany === "string"
              ? metadata.prospectCompany
              : null),
          role: "user",
          is_active: true,
          organization_id: invite.organization_id ?? null,
          organization_role: organizationRole,
        })
        .select("id, organization_id")
        .single();

      if (profileInsert.error) {
        await cleanup();
        throw profileInsert.error;
      }

      const usageInsert = await supabase.from("user_usage_stats").insert({
        user_id: authUserId,
        organization_id: invite.organization_id ?? null,
        contracts_reviewed: 0,
        total_pages_reviewed: 0,
        risk_assessments_completed: 0,
        compliance_checks_completed: 0,
        last_activity: null,
      });

      if (usageInsert.error) {
        await cleanup();
        throw usageInsert.error;
      }

      const planInsert = await supabase.from("user_plans").insert({
        id: crypto.randomUUID(),
        user_id: authUserId,
        plan_type: plan?.key ?? invite.plan_key,
        plan_name: plan?.name ?? invite.plan_key,
        price: plan?.price ?? 0,
        contracts_limit: planQuota.contractsLimit ?? null,
        documents_limit: planQuota.documentsLimit ?? null,
        seats_limit: planQuota.seatsLimit ?? null,
        contracts_used: 0,
        billing_cycle: plan?.billingCycle ?? "trial",
        next_billing_date: null,
        trial_days_remaining:
          (plan?.billingCycle ?? "trial") === "trial"
            ? plan?.trialDurationDays ?? planQuota.contractsLimit ?? plan?.quotas.contractsLimit ?? null
            : null,
        features: plan?.features ?? [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (planInsert.error) {
        await cleanup();
        throw planInsert.error;
      }

      const activityInsert = await supabase.from("user_activities").insert({
        user_id: authUserId,
        organization_id: invite.organization_id ?? null,
        activity_type: "invite_acceptance",
        description: "Accepted onboarding invite link",
        metadata: {
          inviteId: invite.id,
          planKey: invite.plan_key,
        },
      });

      if (activityInsert.error) {
        console.error(
          "[public] Failed to record invite acceptance activity",
          activityInsert.error,
        );
      }

      const acceptedAt = new Date().toISOString();
      const nextMetadata = {
        ...(metadata ?? {}),
        acceptedAt,
        acceptedProfileId: authUserId,
      };

      const inviteUpdate = await supabase
        .from("org_invite_links")
        .update({
          status: "accepted",
          used_at: acceptedAt,
          metadata: nextMetadata,
        })
        .eq("id", invite.id)
        .eq("status", "pending");

      if (inviteUpdate.error) {
        await cleanup();
        throw inviteUpdate.error;
      }

      await logInviteAcceptance(supabase, {
        adminAuthUserId: invite.created_by_auth_user ?? null,
        targetUserId: authUserId,
        inviteId: invite.id,
        organizationId: invite.organization_id ?? null,
        planKey: invite.plan_key,
        inviteType: "org_trial",
      });

      const responsePayload: InviteAcceptanceResponse = {
        userId: authUserId,
        organizationId: invite.organization_id ?? null,
        planKey: invite.plan_key,
        planName: plan?.name ?? invite.plan_key,
        planQuota,
        inviteStatus: "accepted",
      };

      res.status(201).json(responsePayload);
    };

    const handleMemberAcceptance = async (invite: MemberInviteRow) => {
      if (
        invite.status !== "pending" ||
        (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now())
      ) {
        if (invite.status === "pending") {
          await markMemberInviteExpired(supabase, invite.id);
        }
        res.status(410).json({ error: "Invite link is no longer valid" });
        return;
      }

      const normalizedEmail = invite.email.trim().toLowerCase();

      const existingProfiles = await supabase
        .from("user_profiles")
        .select("id, auth_user_id, organization_id")
        .eq("email", normalizedEmail)
        .limit(1);

      if (existingProfiles.error) {
        throw existingProfiles.error;
      }

      const existingProfile = existingProfiles.data?.[0];
      if (existingProfile) {
        if (existingProfile.organization_id === invite.organization_id) {
          res.status(409).json({
            error: "User already in organization",
            details: "This user already belongs to the workspace.",
          });
        } else {
          res.status(409).json({
            error: "Account already exists for this email",
            details: "This email is tied to a different workspace.",
          });
        }
        return;
      }

      const existingUsers = await supabase.auth.admin.listUsers({
        email: normalizedEmail,
      });

      const authExists =
        existingUsers?.users?.some(
          (user: any) => user.email?.toLowerCase() === normalizedEmail,
        ) ?? false;

      if (authExists) {
        res.status(409).json({
          error: "A Supabase auth user already exists for this email",
        });
        return;
      }

      const organizationRes = await supabase
        .from("organizations")
        .select("id, name, billing_plan")
        .eq("id", invite.organization_id)
        .maybeSingle();

      if (organizationRes.error) {
        throw organizationRes.error;
      }

      if (!organizationRes.data) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const organizationName = organizationRes.data.name ?? null;
      const planKey = organizationRes.data.billing_plan ?? null;
      const plan = planKey ? getPlanByKey(planKey) : undefined;
      const planQuota = plan ? plan.quotas : null;

      const createUserResult = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          first_name: payload.firstName ?? "",
          last_name: payload.lastName ?? "",
          company: payload.company ?? organizationName ?? "",
          role: "user",
        },
      });

      if (createUserResult.error) {
        throw createUserResult.error;
      }

      const authUserId = createUserResult.user.id;

      const cleanup = async () => {
        await supabase.from("user_profiles").delete().eq("id", authUserId);
        await supabase
          .from("user_usage_stats")
          .delete()
          .eq("user_id", authUserId);
        await supabase.from("user_plans").delete().eq("user_id", authUserId);
        await supabase.auth.admin.deleteUser(authUserId);
      };

      const organizationRole =
        invite.organization_role === "org_admin" ? "org_admin" : "member";

      const profileInsert = await supabase
        .from("user_profiles")
        .insert({
          id: authUserId,
          auth_user_id: authUserId,
          email: normalizedEmail,
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          company: payload.company ?? organizationName,
          role: "user",
          is_active: true,
          organization_id: invite.organization_id,
          organization_role: organizationRole,
        })
        .select("id")
        .single();

      if (profileInsert.error) {
        await cleanup();
        throw profileInsert.error;
      }

      const usageInsert = await supabase.from("user_usage_stats").insert({
        user_id: authUserId,
        organization_id: invite.organization_id,
        contracts_reviewed: 0,
        total_pages_reviewed: 0,
        risk_assessments_completed: 0,
        compliance_checks_completed: 0,
        last_activity: null,
      });

      if (usageInsert.error) {
        await cleanup();
        throw usageInsert.error;
      }

      if (plan) {
        const planInsert = await supabase.from("user_plans").insert({
          id: crypto.randomUUID(),
          user_id: authUserId,
          plan_type: plan.key,
          plan_name: plan.name,
          price: plan.price,
          contracts_limit: plan.quotas.contractsLimit ?? null,
          documents_limit: plan.quotas.documentsLimit ?? null,
          seats_limit: plan.quotas.seatsLimit ?? null,
          contracts_used: 0,
          billing_cycle: plan.billingCycle,
          next_billing_date: null,
          trial_days_remaining: null,
          features: plan.features,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (planInsert.error) {
          await cleanup();
          throw planInsert.error;
        }
      }

      const activityInsert = await supabase.from("user_activities").insert({
        user_id: authUserId,
        organization_id: invite.organization_id,
        activity_type: "invite_acceptance",
        description: "Accepted team invite",
        metadata: {
          inviteId: invite.id,
          organizationRole,
        },
      });

      if (activityInsert.error) {
        console.error(
          "[public] Failed to record member invite acceptance activity",
          activityInsert.error,
        );
      }

      const memberMetadata = isRecord(invite.metadata) ? invite.metadata : {};
      const acceptedAt = new Date().toISOString();
      const nextMetadata = {
        ...memberMetadata,
        acceptedAt,
        acceptedProfileId: authUserId,
      };

      const inviteUpdate = await supabase
        .from("org_member_invites")
        .update({
          status: "accepted",
          used_at: acceptedAt,
          metadata: nextMetadata,
        })
        .eq("id", invite.id)
        .eq("status", "pending");

      if (inviteUpdate.error) {
        await cleanup();
        throw inviteUpdate.error;
      }

      const invitedByAuthUser =
        typeof memberMetadata.invitedByAuthUser === "string"
          ? memberMetadata.invitedByAuthUser
          : null;

      await logInviteAcceptance(supabase, {
        adminAuthUserId: invitedByAuthUser,
        targetUserId: authUserId,
        inviteId: invite.id,
        organizationId: invite.organization_id,
        planKey: plan?.key ?? planKey,
        inviteType: "org_member",
      });

      const responsePayload: InviteAcceptanceResponse = {
        userId: authUserId,
        organizationId: invite.organization_id,
        planKey: plan?.key ?? planKey,
        planName: plan?.name ?? planKey,
        planQuota,
        inviteStatus: "accepted",
      };

      res.status(201).json(responsePayload);
    };

    try {
      const record = await fetchInviteByToken(supabase, token);
      if (!record) {
        res.status(404).json({ error: "Invite not found" });
        return;
      }

      if (record.type === "org_trial") {
        await handleTrialAcceptance(record.invite);
        return;
      }

      await handleMemberAcceptance(record.invite);
    } catch (error) {
      console.error("[public] Failed to accept invite", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  },
);

export { publicRouter };
