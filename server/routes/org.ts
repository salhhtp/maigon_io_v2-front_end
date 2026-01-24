import express from "express";
import crypto from "crypto";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import { getUserAccessContextByAuthId } from "../lib/userAccess";
import type {
  OrgAlertPreferences,
  OrgAlertSummary,
  OrgComplianceExportItem,
  OrgMemberSummary,
  OrgOverviewMetrics,
  OrgMemberInviteSummary,
} from "../../shared/api";

const APP_BASE_URL = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_ORIGIN ||
  process.env.PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

type AuthorizedAccess = {
  organizationId: string;
  authUserId: string;
  profileId: string | null;
  isMaigonAdmin: boolean;
};

const orgRouter = express.Router();

async function getOrCreateAlertPreferences(
  organizationId: string,
): Promise<OrgAlertPreferences> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("organization_alert_preferences")
    .select("notify_high_risk, notify_pending_edits, alert_channel, last_digest_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from("organization_alert_preferences")
      .insert({ organization_id: organizationId })
      .select("notify_high_risk, notify_pending_edits, alert_channel, last_digest_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      notifyHighRisk: inserted.notify_high_risk,
      notifyPendingEdits: inserted.notify_pending_edits,
      alertChannel: inserted.alert_channel,
      lastDigestAt: inserted.last_digest_at,
    } satisfies OrgAlertPreferences;
  }

  return {
    notifyHighRisk: data.notify_high_risk,
    notifyPendingEdits: data.notify_pending_edits,
    alertChannel: data.alert_channel,
    lastDigestAt: data.last_digest_at,
  } satisfies OrgAlertPreferences;
}

function collectDecisions(
  payload: unknown,
  prefix: string,
  defaultSeverity: string,
): Array<{ severity: string; description: string }> {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item, index) => {
      const data =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : { description: String(item ?? "") };
      const description =
        (typeof data.description === "string" && data.description) ||
        (typeof data.recommendation === "string" && data.recommendation) ||
        (typeof data.action === "string" && data.action) ||
        "";
      const trimmed = description.trim();
      if (!trimmed) return null;
      const severityRaw =
        (typeof data.severity === "string" && data.severity) ||
        defaultSeverity;
      const severity = severityRaw.toLowerCase();
      return { severity, description: trimmed, id: `${prefix}-${index + 1}` };
    })
    .filter((item): item is { severity: string; description: string } => !!item);
}

function extractMissingClausesFromResult(result: Record<string, unknown>): string[] {
  const candidates = [
    result.missing_information,
    result.missing_clauses,
    result.missing_clauses_details,
    result.gaps,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
    }
  }
  const alignment = result.solution_alignment || result.solutionAlignment;
  if (alignment && typeof alignment === "object") {
    const gaps = (alignment as Record<string, unknown>).gaps;
    if (Array.isArray(gaps)) {
      return gaps
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
    }
  }
  return [];
}

async function authorizeRequest(
  req: express.Request,
  res: express.Response,
): Promise<AuthorizedAccess | null> {
  const organizationIdRaw = req.query.organizationId;
  const authUserIdRaw =
    req.header("x-auth-user-id") ?? req.query.authUserId;

  const organizationId =
    typeof organizationIdRaw === "string" ? organizationIdRaw.trim() : "";
  const authUserId =
    typeof authUserIdRaw === "string" ? authUserIdRaw.trim() : "";

  if (!organizationId || !authUserId) {
    res.status(400).json({
      error: "organizationId and authUserId are required",
    });
    return null;
  }

  try {
    const access = await getUserAccessContextByAuthId(authUserId);

    if (!access) {
      res.status(401).json({ error: "Unauthorized" });
      return null;
    }

    const isOrgAdmin =
      access.organizationId === organizationId &&
      access.organizationRole === "org_admin";

    if (!access.isMaigonAdmin && !isOrgAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }

    return {
      organizationId,
      authUserId,
      profileId: access.profileId,
      isMaigonAdmin: access.isMaigonAdmin,
    };
  } catch (error) {
    console.error("[org] Authorization failure", error);
    res.status(500).json({ error: "Failed to authorize request" });
    return null;
  }
}

function createInviteToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function mapMemberInviteRow(row: any): OrgMemberInviteSummary {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    organizationId: row.organization_id,
    organizationRole: row.organization_role ?? "member",
    status: row.status,
    invitedBy: row.invited_by_profile
        ? {
            profileId: row.invited_by_profile.id ?? null,
            name:
              `${row.invited_by_profile.first_name ?? ""} ${row.invited_by_profile.last_name ?? ""}`
                .trim()
                .replace(/\s+/g, " ") ||
              (row.invited_by_profile.email ?? null),
            email: row.invited_by_profile.email ?? null,
          }
      : null,
    expiresAt: row.expires_at ?? null,
    usedAt: row.used_at ?? null,
    createdAt: row.created_at,
    inviteUrl: `${APP_BASE_URL}/invite/${row.token}`,
    metadata: row.metadata ?? {},
  } satisfies OrgMemberInviteSummary;
}

async function sendMemberInviteEmail(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  params: {
    email: string;
    inviteUrl: string;
    organizationName: string | null;
    invitedByName?: string | null;
    expiresAt?: string | null;
  },
): Promise<{ success: boolean; message?: string }> {
  const functionName =
    process.env.SUPABASE_FUNCTION_MEMBER_INVITE ||
    process.env.SENDGRID_MEMBER_INVITE_FUNCTION ||
    "";

  if (!functionName) {
    console.info(
      "[org] Member invite email function not configured; manual send required",
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
        organizationName: params.organizationName,
        invitedBy: params.invitedByName ?? null,
        expiresAt: params.expiresAt ?? null,
      },
    });

    if (error) {
      console.error("[org] Failed to dispatch member invite email", error);
      return {
        success: false,
        message: error.message ?? "Failed to dispatch member invite email",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[org] Unexpected member invite email failure", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unexpected email error",
    };
  }
}

orgRouter.get("/overview", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const supabase = getSupabaseAdminClient();

  try {
    const [
      ingestionsRes,
      reviewsRes,
      metricsRes,
      interactionsRes,
      approvalsRes,
    ] = await Promise.all([
        supabase
          .from("contract_ingestions")
          .select("status")
          .eq("organization_id", organizationId),
        supabase
          .from("contract_reviews")
          .select("review_type, score")
          .eq("organization_id", organizationId),
        supabase
          .from("analysis_metrics")
          .select("fallback_used, model_used")
          .eq("organization_id", organizationId),
        supabase
          .from("agent_interaction_logs")
          .select("fallback_used, latency_ms")
          .eq("organization_id", organizationId),
        supabase
          .from("agent_edit_approvals")
          .select("id")
          .eq("organization_id", organizationId),
      ]);

    const errors = [
      ingestionsRes.error,
      reviewsRes.error,
      metricsRes.error,
      interactionsRes.error,
      approvalsRes.error,
    ].filter(
      Boolean,
    );
    if (errors.length > 0) {
      console.error("[org] Overview query errors", errors);
      res.status(500).json({ error: "Failed to load organization overview" });
      return;
    }

    const ingestionsByStatus = (ingestionsRes.data ?? []).reduce(
      (acc, item) => {
        const status = item.status ?? "unknown";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const reviews = reviewsRes.data ?? [];
    const reviewTotals = reviews.length;
    const reviewByType = reviews.reduce((acc, review) => {
      const key = review.review_type ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const scoredReviews = reviews.filter(
      (review) => typeof review.score === "number",
    );
    const averageScore = scoredReviews.length
      ? scoredReviews.reduce((sum, review) => sum + (review.score ?? 0), 0) /
        scoredReviews.length
      : null;

    const metrics = metricsRes.data ?? [];
    const metricsTotal = metrics.length;
    const fallbackCount = metrics.filter((metric) => metric.fallback_used)
      .length;
    const metricsByModel = metrics.reduce((acc, metric) => {
      if (metric.model_used) {
        acc[metric.model_used] = (acc[metric.model_used] ?? 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const interactions = interactionsRes.data ?? [];
    const interactionTotal = interactions.length;
    const interactionFallbackCount = interactions.filter(
      (interaction) => interaction.fallback_used,
    ).length;
    const latencySamples = interactions
      .map((interaction) => interaction.latency_ms)
      .filter((value): value is number => typeof value === "number");
    const averageLatencyMs = latencySamples.length
      ? Math.round(
          latencySamples.reduce((sum, latency) => sum + latency, 0) /
            latencySamples.length,
        )
      : null;
    const approvalsCount = approvalsRes.data?.length ?? 0;

    const overview: OrgOverviewMetrics = {
      organizationId,
      ingestions: {
        total: (ingestionsRes.data ?? []).length,
        byStatus: ingestionsByStatus,
      },
      reviews: {
        total: reviewTotals,
        byType: reviewByType,
        averageScore,
      },
      analysis: {
        total: metricsTotal,
        fallbackCount,
        fallbackRate: metricsTotal
          ? Number((fallbackCount / metricsTotal).toFixed(3))
          : 0,
        byModel: metricsByModel,
      },
      agentUsage: {
        totalInteractions: interactionTotal,
        fallbackInteractions: interactionFallbackCount,
        approvedEdits: approvalsCount,
        averageLatencyMs,
      },
    };

    res.json(overview);
  } catch (error) {
    console.error("[org] Overview failure", error);
    res.status(500).json({ error: "Failed to compute organization overview" });
  }
});

orgRouter.get("/members", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const supabase = getSupabaseAdminClient();

  try {
    const [profilesRes, usageRes, metricsRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select(
          "id, email, first_name, last_name, organization_role, is_active",
        )
        .eq("organization_id", organizationId),
      supabase
        .from("user_usage_stats")
        .select(
          "user_id, contracts_reviewed, risk_assessments_completed, compliance_checks_completed, last_activity",
        )
        .eq("organization_id", organizationId),
      supabase
        .from("analysis_metrics")
        .select("user_id, status")
        .eq("organization_id", organizationId),
    ]);

    const errors = [profilesRes.error, usageRes.error, metricsRes.error].filter(
      Boolean,
    );
    if (errors.length > 0) {
      console.error("[org] Members query errors", errors);
      res.status(500).json({ error: "Failed to load members" });
      return;
    }

    const usageMap = new Map(
      (usageRes.data ?? []).map((row) => [row.user_id, row]),
    );

    const openActionsMap = (metricsRes.data ?? []).reduce(
      (acc, metric) => {
        if (metric.user_id && metric.status && metric.status !== "completed") {
          acc.set(metric.user_id, (acc.get(metric.user_id) ?? 0) + 1);
        }
        return acc;
      },
      new Map<string, number>(),
    );

    const members: OrgMemberSummary[] = (profilesRes.data ?? []).map(
      (profile) => {
        const usage = usageMap.get(profile.id);
        const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`
          .trim()
          .replace(/\s+/g, " ");

        return {
          userId: profile.id,
          name: fullName || profile.email || profile.id,
          email: profile.email,
          organizationRole:
            profile.organization_role === "org_admin"
              ? "org_admin"
              : profile.organization_role === "member"
                ? "member"
                : null,
          isActive: profile.is_active ?? true,
          usage: {
            contractsReviewed: usage?.contracts_reviewed ?? 0,
            riskAssessmentsCompleted: usage?.risk_assessments_completed ?? 0,
            complianceChecksCompleted:
              usage?.compliance_checks_completed ?? 0,
            lastActivity: usage?.last_activity ?? null,
          },
          openActionItems: openActionsMap.get(profile.id) ?? 0,
        } satisfies OrgMemberSummary;
      },
    );

    res.json({ organizationId, members });
  } catch (error) {
    console.error("[org] Members failure", error);
    res.status(500).json({ error: "Failed to load organization members" });
  }
});

orgRouter.get("/compliance-export", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const supabase = getSupabaseAdminClient();

  try {
    const approvalsRes = await supabase
      .from("agent_edit_approvals")
      .select(
        "id, interaction_id, user_id, contract_id, review_id, clause_reference, change_type, suggested_text, rationale, metadata, accepted_at",
      )
      .eq("organization_id", organizationId)
      .order("accepted_at", { ascending: false });

    if (approvalsRes.error) {
      console.error("[org] Compliance export query error", approvalsRes.error);
      res.status(500).json({ error: "Failed to load compliance export" });
      return;
    }

    const approvals = approvalsRes.data ?? [];
    const userIds = Array.from(new Set(approvals.map((item) => item.user_id)));

    const userProfilesRes = userIds.length
      ? await supabase
          .from("user_profiles")
          .select("id, email")
          .in("id", userIds)
      : { data: [], error: null };

    if (userProfilesRes.error) {
      console.error("[org] Compliance export user lookup error", userProfilesRes.error);
      res.status(500).json({ error: "Failed to resolve user profiles" });
      return;
    }

    const userEmailMap = new Map(
      (userProfilesRes.data ?? []).map((profile) => [profile.id, profile.email]),
    );

    const items: OrgComplianceExportItem[] = approvals.map((approval) => {
      const metadata =
        approval.metadata &&
        typeof approval.metadata === "object" &&
        !Array.isArray(approval.metadata)
          ? (approval.metadata as Record<string, unknown>)
          : {};

      const provider =
        typeof metadata.provider === "string" ? metadata.provider : null;
      const model =
        typeof metadata.model === "string" ? metadata.model : null;

      return {
        id: approval.id,
        interactionId: approval.interaction_id,
        userId: approval.user_id,
        userEmail: userEmailMap.get(approval.user_id) ?? null,
        contractId: approval.contract_id,
        reviewId: approval.review_id,
        clauseReference: approval.clause_reference,
        changeType: approval.change_type,
        suggestedText: approval.suggested_text,
        rationale: approval.rationale,
        acceptedAt: approval.accepted_at,
        provider,
        model,
      } satisfies OrgComplianceExportItem;
    });

    res.json({ organizationId, items });
  } catch (error) {
    console.error("[org] Compliance export failure", error);
    res.status(500).json({ error: "Failed to load compliance export" });
  }
});

orgRouter.get("/alerts/preferences", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  try {
    const preferences = await getOrCreateAlertPreferences(
      authorized.organizationId,
    );
    res.json({ organizationId: authorized.organizationId, preferences });
  } catch (error) {
    console.error("[org] Alert preferences fetch failure", error);
    res.status(500).json({ error: "Failed to load alert preferences" });
  }
});

orgRouter.patch("/alerts/preferences", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const { notifyHighRisk, notifyPendingEdits, alertChannel } =
    (req.body as Record<string, unknown>) ?? {};

  const payload: Record<string, unknown> = { organization_id: organizationId };
  if (typeof notifyHighRisk === "boolean") {
    payload.notify_high_risk = notifyHighRisk;
  }
  if (typeof notifyPendingEdits === "boolean") {
    payload.notify_pending_edits = notifyPendingEdits;
  }
  if (typeof alertChannel === "string" && alertChannel.trim().length > 0) {
    payload.alert_channel = alertChannel.trim();
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { error } = await supabase
      .from("organization_alert_preferences")
      .upsert(payload, { onConflict: "organization_id" });

    if (error) {
      throw error;
    }

    const preferences = await getOrCreateAlertPreferences(organizationId);
    res.json({ organizationId, preferences });
  } catch (error) {
    console.error("[org] Alert preferences update failure", error);
    res.status(500).json({ error: "Failed to update alert preferences" });
  }
});

orgRouter.get("/alerts/summary", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const supabase = getSupabaseAdminClient();

  try {
    const [reviewsRes, interactionsRes, approvalsRes] = await Promise.all([
      supabase
        .from("contract_reviews")
        .select(
          "id, contract_id, results, created_at, contracts (title, updated_at)"
        )
        .eq("organization_id", organizationId),
      supabase
        .from("agent_interaction_logs")
        .select("id, edit_count, fallback_used")
        .eq("organization_id", organizationId),
      supabase
        .from("agent_edit_approvals")
        .select("interaction_id")
        .eq("organization_id", organizationId),
    ]);

    const errors = [reviewsRes.error, interactionsRes.error, approvalsRes.error].filter(Boolean);
    if (errors.length) {
      console.error("[org] Alert summary query errors", errors);
      res.status(500).json({ error: "Failed to load alert summary" });
      return;
    }

    const reviews = reviewsRes.data ?? [];
    const interactions = interactionsRes.data ?? [];
    const approvals = approvalsRes.data ?? [];

    const highRiskItems: OrgAlertSummary["highRiskItems"] = [];
    let highRiskCount = 0;

    reviews.forEach((review) => {
      const results = review?.results as Record<string, unknown> | null;
      if (!results) return;

      const recommendations = collectDecisions(
        results.recommendations,
        "rec",
        "medium",
      );
      const strategic = collectDecisions(
        results.strategic_recommendations,
        "strat",
        "medium",
      );
      const actionItems = collectDecisions(
        results.action_items,
        "act",
        "high",
      );

      const combined = [...recommendations, ...strategic, ...actionItems];
      combined.forEach((item) => {
        if (item.severity === "critical" || item.severity === "high") {
          highRiskCount += 1;
          highRiskItems.push({
            contractId: review.contract_id ?? null,
            reviewId: review.id,
            title:
              (review.contracts as { title?: string } | null)?.title ?? null,
            severity: item.severity,
            updatedAt:
              (review.contracts as { updated_at?: string } | null)?.updated_at ??
              review.created_at ?? null,
          });
        }
      });
    });

    const interactionsWithEdits = interactions.filter(
      (interaction) => (interaction.edit_count ?? 0) > 0,
    );
    const approvalsByInteraction = new Set(
      approvals
        .map((approval) => approval?.interaction_id)
        .filter((value): value is string => Boolean(value)),
    );

    const pendingAgentEdits = interactionsWithEdits.filter(
      (interaction) =>
        interaction.id && !approvalsByInteraction.has(interaction.id),
    ).length;

    const fallbackInteractions = interactions.filter(
      (interaction) => interaction.fallback_used,
    ).length;

    const summary: OrgAlertSummary = {
      organizationId,
      highRiskCount,
      highRiskItems: highRiskItems.slice(0, 10),
      pendingAgentEdits,
      fallbackInteractions,
      generatedAt: new Date().toISOString(),
    };

    res.json(summary);
  } catch (error) {
    console.error("[org] Alert summary failure", error);
    res.status(500).json({ error: "Failed to build alert summary" });
  }
});

orgRouter.get("/member-invites", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from("org_member_invites")
      .select(
        "id, token, email, organization_id, organization_role, status, invited_by_profile:invited_by_profile(id, email, first_name, last_name), expires_at, used_at, created_at, metadata",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const invites = (data ?? []).map(mapMemberInviteRow);
    res.json({ organizationId, invites });
  } catch (error) {
    console.error("[org] Failed to list member invites", error);
    res.status(500).json({ error: "Failed to list member invites" });
  }
});

interface CreateMemberInvitePayload {
  email: string;
  role?: "member" | "org_admin";
  expiresInDays?: number;
  sendEmail?: boolean;
  metadata?: Record<string, unknown>;
}

orgRouter.post("/member-invites", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId, authUserId, profileId } = authorized;
  const payload = (req.body as CreateMemberInvitePayload) ?? {};
  const supabase = getSupabaseAdminClient();

  const normalizedEmail =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    res.status(400).json({ error: "Invite email is required" });
    return;
  }

  const organizationRole = payload.role === "org_admin" ? "org_admin" : "member";

  try {
    const organizationRes = await supabase
      .from("organizations")
      .select("id, name, seats_limit")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationRes.error) {
      throw organizationRes.error;
    }

    if (!organizationRes.data) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    const organizationName = organizationRes.data.name ?? null;
    const seatsLimit = organizationRes.data.seats_limit ?? null;

    if (organizationRole !== "org_admin" && seatsLimit && seatsLimit > 0) {
      const activeMembersRes = await supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (activeMembersRes.error) {
        throw activeMembersRes.error;
      }

      const pendingInvitesRes = await supabase
        .from("org_member_invites")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "pending");

      if (pendingInvitesRes.error) {
        throw pendingInvitesRes.error;
      }

      const activeMembers = activeMembersRes.count ?? 0;
      const pendingInvites = pendingInvitesRes.count ?? 0;
      const projectedSeats = activeMembers + pendingInvites + 1;

      if (projectedSeats > seatsLimit) {
        res.status(409).json({
          error: "Seat limit reached",
          details: "All available seats are currently allocated. Contact Maigon to expand your plan.",
        });
        return;
      }
    }

    const existingProfile = await supabase
      .from("user_profiles")
      .select("id, organization_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile.error) {
      throw existingProfile.error;
    }

    if (existingProfile.data && existingProfile.data.organization_id === organizationId) {
      res.status(409).json({
        error: "User already in organization",
        details: "This email is already associated with your workspace.",
      });
      return;
    }

    const existingInvite = await supabase
      .from("org_member_invites")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite.error) {
      throw existingInvite.error;
    }

    if (existingInvite.data) {
      res.status(409).json({
        error: "Invite already pending",
        details: "An invite for this email is already pending acceptance.",
      });
      return;
    }

    const expiresInDays =
      typeof payload.expiresInDays === "number" && payload.expiresInDays > 0
        ? Math.floor(payload.expiresInDays)
        : 14;

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const token = createInviteToken();

    const metadata = {
      ...(payload.metadata ?? {}),
      invitedByAuthUser: authUserId,
      invitedByProfile: profileId,
      organizationRole,
    } as Record<string, unknown>;

    const inviteInsert = await supabase
      .from("org_member_invites")
      .insert({
        token,
        email: normalizedEmail,
        organization_id: organizationId,
        organization_role: organizationRole,
        status: "pending",
        invited_by_profile: profileId,
        expires_at: expiresAt.toISOString(),
        metadata,
      })
      .select(
        "id, token, email, organization_id, organization_role, status, invited_by_profile:invited_by_profile(id, email, first_name, last_name), expires_at, used_at, created_at, metadata",
      )
      .single();

    if (inviteInsert.error) {
      throw inviteInsert.error;
    }

    const inviteRow = inviteInsert.data;

    if (payload.sendEmail) {
      const invitedByName = inviteRow.invited_by_profile
        ? `${inviteRow.invited_by_profile.first_name ?? ""} ${inviteRow.invited_by_profile.last_name ?? ""}`
            .trim()
            .replace(/\s+/g, " ") ||
          (inviteRow.invited_by_profile.email ?? null)
        : null;

      const dispatchResult = await sendMemberInviteEmail(supabase, {
        email: normalizedEmail,
        inviteUrl: `${APP_BASE_URL}/invite/${inviteRow.token}`,
        organizationName,
        invitedByName,
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

      const updateMetadata = await supabase
        .from("org_member_invites")
        .update({ metadata: nextMetadata })
        .eq("id", inviteRow.id);

      if (updateMetadata.error) {
        throw updateMetadata.error;
      }

      inviteRow.metadata = nextMetadata;
    }

    await supabase.from("admin_activity_log").insert({
      admin_auth_user_id: authorized.authUserId,
      target_user_id: null,
      action: "org_member_invite_create",
      metadata: {
        inviteId: inviteRow.id,
        organizationId,
        email: normalizedEmail,
        role: organizationRole,
      },
    });

    const summary = mapMemberInviteRow(inviteRow);
    res.status(201).json({ invite: summary });
  } catch (error) {
    console.error("[org] Failed to create member invite", error);
    res.status(500).json({ error: "Failed to create member invite" });
  }
});

orgRouter.post("/member-invites/:id/resend", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const inviteId = req.params.id;
  const supabase = getSupabaseAdminClient();

  try {
    const inviteRes = await supabase
      .from("org_member_invites")
      .select(
        "id, token, email, organization_id, organization_role, status, invited_by_profile:invited_by_profile(id, email, first_name, last_name), expires_at, used_at, created_at, metadata",
      )
      .eq("organization_id", organizationId)
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteRes.error) {
      throw inviteRes.error;
    }

    const inviteRow = inviteRes.data;
    if (!inviteRow) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    if (inviteRow.status === "cancelled" || inviteRow.status === "accepted") {
      res.status(409).json({
        error: "Invite cannot be resent",
        details: "Only pending or expired invites can be resent.",
      });
      return;
    }

    const newToken = createInviteToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const updateRes = await supabase
      .from("org_member_invites")
      .update({
        token: newToken,
        status: "pending",
        used_at: null,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", inviteRow.id)
      .select(
        "id, token, email, organization_id, organization_role, status, invited_by_profile:invited_by_profile(id, email, first_name, last_name), expires_at, used_at, created_at, metadata",
      )
      .single();

    if (updateRes.error) {
      throw updateRes.error;
    }

    const refreshedInvite = updateRes.data;

    const orgRes = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgRes.error) {
      throw orgRes.error;
    }

    const organizationName = orgRes.data?.name ?? null;
      const invitedByName = refreshedInvite.invited_by_profile
        ? `${refreshedInvite.invited_by_profile.first_name ?? ""} ${refreshedInvite.invited_by_profile.last_name ?? ""}`
            .trim()
            .replace(/\s+/g, " ") ||
          (refreshedInvite.invited_by_profile.email ?? null)
        : null;

    const dispatchResult = await sendMemberInviteEmail(supabase, {
      email: refreshedInvite.email,
      inviteUrl: `${APP_BASE_URL}/invite/${refreshedInvite.token}`,
      organizationName,
      invitedByName,
      expiresAt: refreshedInvite.expires_at ?? null,
    });

    const nextMetadata = {
      ...(refreshedInvite.metadata ?? {}),
      emailDispatch: {
        requestedAt: new Date().toISOString(),
        success: dispatchResult.success,
        message: dispatchResult.message ?? null,
      },
    };

    const metadataUpdate = await supabase
      .from("org_member_invites")
      .update({ metadata: nextMetadata })
      .eq("id", refreshedInvite.id);

    if (metadataUpdate.error) {
      throw metadataUpdate.error;
    }

    refreshedInvite.metadata = nextMetadata;

    res.json({ invite: mapMemberInviteRow(refreshedInvite) });
  } catch (error) {
    console.error("[org] Failed to resend member invite", error);
    res.status(500).json({ error: "Failed to resend member invite" });
  }
});

orgRouter.post("/member-invites/:id/cancel", async (req, res) => {
  const authorized = await authorizeRequest(req, res);
  if (!authorized) return;

  const { organizationId } = authorized;
  const inviteId = req.params.id;
  const supabase = getSupabaseAdminClient();

  try {
    const updateRes = await supabase
      .from("org_member_invites")
      .update({ status: "cancelled" })
      .eq("organization_id", organizationId)
      .eq("id", inviteId)
      .select(
        "id, token, email, organization_id, organization_role, status, invited_by_profile:invited_by_profile(id, email, first_name, last_name), expires_at, used_at, created_at, metadata",
      )
      .single();

    if (updateRes.error) {
      throw updateRes.error;
    }

    if (!updateRes.data) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    res.json({ invite: mapMemberInviteRow(updateRes.data) });
  } catch (error) {
    console.error("[org] Failed to cancel member invite", error);
    res.status(500).json({ error: "Failed to cancel member invite" });
  }
});

export { orgRouter };
