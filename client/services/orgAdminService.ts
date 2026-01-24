import { supabase } from "@/lib/supabase";
import logger from "@/utils/logger";
import type {
  OrgAlertPreferences,
  OrgAlertSummary,
  OrgComplianceExportItem,
  OrgMemberInviteSummary,
  OrgMemberSummary,
  OrgOverviewMetrics,
} from "@shared/api";

export interface ReviewInsights {
  severity: Record<string, number>;
  totalPrioritized: number;
  missingClauses: Array<{ clause: string; count: number }>;
}

export interface CreateMemberInviteRequest {
  email: string;
  role?: "member" | "org_admin";
  expiresInDays?: number;
  sendEmail?: boolean;
}

function extractMissingClauses(result: Record<string, unknown>): string[] {
  const structured =
    result.structured_report && typeof result.structured_report === "object"
      ? (result.structured_report as Record<string, unknown>)
      : result;
  const coverage =
    structured.metadata &&
    typeof structured.metadata === "object" &&
    (structured.metadata as Record<string, unknown>).playbookCoverage &&
    typeof (structured.metadata as Record<string, unknown>).playbookCoverage ===
      "object"
      ? ((structured.metadata as Record<string, unknown>)
          .playbookCoverage as Record<string, unknown>)
      : null;
  if (coverage) {
    const missing: string[] = [];
    const critical = Array.isArray(coverage.criticalClauses)
      ? (coverage.criticalClauses as Array<Record<string, unknown>>)
      : [];
    critical.forEach((clause) => {
      if (clause.met === false && typeof clause.title === "string") {
        const missingBits = Array.isArray(clause.missingMustInclude)
          ? clause.missingMustInclude.join(", ")
          : "";
        missing.push(
          missingBits
            ? `${clause.title}: Missing elements: ${missingBits}`
            : `${clause.title}: Missing required language.`,
        );
      }
    });
    const anchors = Array.isArray(coverage.anchorCoverage)
      ? (coverage.anchorCoverage as Array<Record<string, unknown>>)
      : [];
    anchors.forEach((anchor) => {
      if (anchor.met === false && typeof anchor.anchor === "string") {
        missing.push(`Missing: ${anchor.anchor}`);
      }
    });
    if (missing.length > 0) {
      return missing;
    }
  }

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

async function requestOrgEndpoint<T>(
  path: string,
  organizationId: string,
  authUserId: string,
): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-auth-user-id": authUserId,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Request to ${url.pathname} failed (${response.status}): ${text}`,
    );
  }

  return (await response.json()) as T;
}

async function mutateOrgEndpoint<T>(
  path: string,
  organizationId: string,
  authUserId: string,
  options: RequestInit,
): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-auth-user-id": authUserId,
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Request to ${url.pathname} failed (${response.status}): ${text}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function fetchReviewInsights(
  organizationId: string,
): Promise<ReviewInsights> {
  const { data, error } = await supabase
    .from("contract_reviews")
    .select("results")
    .eq("organization_id", organizationId);

  if (error) {
    logger.error("Failed to load org review insights", { error });
    throw error;
  }

  const severityBuckets: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    default: 0,
  };
  const missingCounts = new Map<string, number>();

  (data ?? []).forEach((row) => {
    const results = row?.results as
      | Record<string, unknown>
      | null
      | undefined;
    if (!results) return;

    const structured =
      results.structured_report && typeof results.structured_report === "object"
        ? (results.structured_report as Record<string, unknown>)
        : null;
    const issues = structured && Array.isArray(structured.issuesToAddress)
      ? (structured.issuesToAddress as Array<Record<string, unknown>>)
      : [];
    if (issues.length > 0) {
      issues.forEach((issue) => {
        const severity =
          typeof issue.severity === "string"
            ? issue.severity.toLowerCase()
            : "default";
        if (severityBuckets[severity] !== undefined) {
          severityBuckets[severity] += 1;
        } else {
          severityBuckets.default += 1;
        }
      });
    }

    extractMissingClauses(results).forEach((clause) => {
      missingCounts.set(clause, (missingCounts.get(clause) ?? 0) + 1);
    });
  });

  const missingClauses = Array.from(missingCounts.entries())
    .map(([clause, count]) => ({ clause, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalPrioritized = Object.keys(severityBuckets).reduce(
    (sum, key) => sum + (severityBuckets[key] ?? 0),
    0,
  );

  return {
    severity: severityBuckets,
    totalPrioritized,
    missingClauses,
  };
}

class OrgAdminService {
  static async getOverview(
    organizationId: string,
    authUserId: string,
  ): Promise<OrgOverviewMetrics> {
    return requestOrgEndpoint<OrgOverviewMetrics>(
      "/api/org/overview",
      organizationId,
      authUserId,
    );
  }

  static async getMembers(
    organizationId: string,
    authUserId: string,
  ): Promise<OrgMemberSummary[]> {
    const response = await requestOrgEndpoint<{
      organizationId: string;
      members: OrgMemberSummary[];
    }>("/api/org/members", organizationId, authUserId);
    return response.members;
  }

  static async getComplianceItems(
    organizationId: string,
    authUserId: string,
  ): Promise<OrgComplianceExportItem[]> {
    const response = await requestOrgEndpoint<{
      organizationId: string;
      items: OrgComplianceExportItem[];
    }>("/api/org/compliance-export", organizationId, authUserId);
    return response.items;
  }

  static async getReviewInsights(
    organizationId: string,
  ): Promise<ReviewInsights> {
    return fetchReviewInsights(organizationId);
  }

  static async getAlertPreferences(
    organizationId: string,
    authUserId: string,
  ): Promise<OrgAlertPreferences> {
    const response = await requestOrgEndpoint<{
      organizationId: string;
      preferences: OrgAlertPreferences;
    }>("/api/org/alerts/preferences", organizationId, authUserId);
    return response.preferences;
  }

  static async updateAlertPreferences(
    organizationId: string,
    authUserId: string,
    updates: Partial<OrgAlertPreferences>,
  ): Promise<OrgAlertPreferences> {
    const url = new URL("/api/org/alerts/preferences", window.location.origin);
    url.searchParams.set("organizationId", organizationId);

    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
      },
      credentials: "include",
      body: JSON.stringify({
        notifyHighRisk: updates.notifyHighRisk,
        notifyPendingEdits: updates.notifyPendingEdits,
        alertChannel: updates.alertChannel,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update alert preferences: ${text}`);
    }

    const payload = (await response.json()) as {
      organizationId: string;
      preferences: OrgAlertPreferences;
    };
    return payload.preferences;
  }

  static async getAlertSummary(
    organizationId: string,
    authUserId: string,
  ): Promise<OrgAlertSummary> {
    return requestOrgEndpoint<OrgAlertSummary>(
      "/api/org/alerts/summary",
      organizationId,
      authUserId,
    );
  }

  static async listMemberInvites(
    organizationId: string,
    authUserId: string,
  ): Promise<OrgMemberInviteSummary[]> {
    const payload = await requestOrgEndpoint<{
      organizationId: string;
      invites: OrgMemberInviteSummary[];
    }>("/api/org/member-invites", organizationId, authUserId);

    return payload.invites ?? [];
  }

  static async createMemberInvite(
    organizationId: string,
    authUserId: string,
    payload: CreateMemberInviteRequest,
  ): Promise<OrgMemberInviteSummary> {
    const response = await mutateOrgEndpoint<{ invite: OrgMemberInviteSummary }>(
      "/api/org/member-invites",
      organizationId,
      authUserId,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return response.invite;
  }

  static async resendMemberInvite(
    organizationId: string,
    authUserId: string,
    inviteId: string,
  ): Promise<OrgMemberInviteSummary> {
    const response = await mutateOrgEndpoint<{ invite: OrgMemberInviteSummary }>(
      `/api/org/member-invites/${inviteId}/resend`,
      organizationId,
      authUserId,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    return response.invite;
  }

  static async cancelMemberInvite(
    organizationId: string,
    authUserId: string,
    inviteId: string,
  ): Promise<OrgMemberInviteSummary> {
    const response = await mutateOrgEndpoint<{ invite: OrgMemberInviteSummary }>(
      `/api/org/member-invites/${inviteId}/cancel`,
      organizationId,
      authUserId,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    return response.invite;
  }

  static buildCsv(items: OrgComplianceExportItem[]): string {
    const headers = [
      "id",
      "interactionId",
      "userId",
      "userEmail",
      "contractId",
      "reviewId",
      "clauseReference",
      "changeType",
      "suggestedText",
      "rationale",
      "acceptedAt",
      "provider",
      "model",
    ];

    const escape = (value: unknown) => {
      if (value == null) return "";
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const rows = items.map((item) =>
      [
        item.id,
        item.interactionId,
        item.userId,
        item.userEmail,
        item.contractId,
        item.reviewId,
        item.clauseReference,
        item.changeType,
        item.suggestedText,
        item.rationale,
        item.acceptedAt,
        item.provider,
        item.model,
      ]
        .map(escape)
        .join(","),
    );

    return [headers.join(","), ...rows].join("\n");
  }

  static triggerDownload(
    content: string,
    filename: string,
    mimeType: string,
  ) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default OrgAdminService;
