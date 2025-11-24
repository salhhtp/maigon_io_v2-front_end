/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

import type { PlanKey } from "./plans";

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface StorageObjectRef {
  bucket: string;
  path: string;
}

export interface ExtractionAssets {
  docxTemplate?: StorageObjectRef | null;
  htmlPackage?: StorageObjectRef | null;
}

export type AIModelId =
  | "openai-gpt-3.5-turbo"
  | "openai-gpt-4"
  | "openai-gpt-4o"
  | "openai-gpt-5-pro"
  | "openai-gpt-5"
  | "openai-gpt-5-mini"
  | "anthropic-claude-3"
  | "anthropic-claude-3-opus"
  | "google-gemini-pro";

export interface CustomSolutionPrompts {
  systemPrompt: string;
  analysisPrompt: string;
  riskPrompt?: string;
  compliancePrompt?: string;
  draftingPrompt?: string;
}

export interface CustomSolutionSectionConfig {
  id: string;
  title: string;
  description?: string;
  enabled?: boolean;
  icon?: string;
  accentColor?: string;
}

export interface CustomSolutionClauseTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  mustInclude?: string[];
  redFlags?: string[];
  references?: string[];
  severity?: "critical" | "high" | "medium" | "low";
}

export interface CustomSolutionDeviationRule {
  id: string;
  title: string;
  expected: string;
  severity: "critical" | "high" | "medium" | "low";
  guidance?: string;
  clauseCategory?: string;
  tags?: string[];
}

export interface CustomSolutionSimilarityBenchmark {
  id: string;
  title: string;
  description?: string;
  referenceType?: "precedent" | "policy" | "custom";
  referenceId?: string | null;
  url?: string | null;
  threshold?: number;
  notes?: string;
}

export interface CustomSolutionModelSettings {
  reasoningModel: AIModelId;
  classifierModel?: AIModelId | string;
  embeddingsModel?: string;
  temperature?: number;
  topP?: number;
  enableChainOfThought?: boolean;
}

export interface CustomSolutionDraftingSettings {
  previewMode?: "side_by_side" | "inline";
  enableInstantPreview?: boolean;
  autoApplyLowRiskEdits?: boolean;
  trackedChanges?: boolean;
  downloadFormats?: string[];
}

export interface CustomSolutionMetadata {
  sectionLayout?: CustomSolutionSectionConfig[];
  clauseLibrary?: CustomSolutionClauseTemplate[];
  deviationRules?: CustomSolutionDeviationRule[];
  similarityBenchmarks?: CustomSolutionSimilarityBenchmark[];
  modelSettings?: CustomSolutionModelSettings;
  draftingSettings?: CustomSolutionDraftingSettings;
}

export interface CustomSolution extends CustomSolutionMetadata {
  id?: string;
  name: string;
  description: string;
  contractType: string;
  complianceFramework: string[];
  riskLevel: "low" | "medium" | "high";
  customRules: string;
  analysisDepth: "basic" | "standard" | "comprehensive";
  reportFormat: "summary" | "detailed" | "executive";
  aiModel: AIModelId;
  organizationId?: string | null;
  prompts: CustomSolutionPrompts;
  isPublic?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface ContractReviewPayload {
  contract: {
    id: string;
    title: string;
    content?: string | null;
    content_html?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  review: {
    id: string;
    review_type: string;
    results: Record<string, unknown>;
    score?: number | null;
    confidence_level?: number | null;
    created_at?: string | null;
  };
  metadata?: {
    fileName?: string;
    fileSize?: number;
    solutionTitle?: string;
    perspective?: string;
  };
  timings?: {
    workflowMs?: number | null;
    analysisMs?: number | null;
  };
  classification?: Record<string, unknown> | null;
}

export type OrganizationRole = "member" | "org_admin";

export interface OrganizationQuotaConfig {
  contractsLimit: number | null;
  seatsLimit: number | null;
  documentsLimit: number | null;
  additional: Record<string, number | string | boolean>;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string | null;
  billingPlan: string;
  seatsLimit: number;
  documentsLimit: number;
  metadata: Record<string, unknown>;
}

export interface UserAccessContext {
  profileId: string;
  authUserId: string | null;
  maigonRole: "user" | "admin";
  isMaigonAdmin: boolean;
  organizationId: string | null;
  organizationRole: OrganizationRole | null;
  organization: OrganizationSummary | null;
  quotas: OrganizationQuotaConfig | null;
}

export function resolveOrganizationQuotas(
  organization: OrganizationSummary | null,
): OrganizationQuotaConfig | null {
  if (!organization) {
    return null;
  }

  const metadata = organization.metadata || {};
  const quotas = (metadata as Record<string, unknown>)["quotas"];
  let contractsLimit: number | null = null;
  const additional: Record<string, number | string | boolean> = {};

  if (typeof quotas === "object" && quotas !== null && !Array.isArray(quotas)) {
    Object.entries(quotas).forEach(([key, value]) => {
      if (key === "contractsLimit" && typeof value === "number") {
        contractsLimit = value;
        return;
      }

      if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "string"
      ) {
        additional[key] = value;
      }
    });
  }

  return {
    contractsLimit,
    seatsLimit: organization.seatsLimit ?? null,
    documentsLimit: organization.documentsLimit ?? null,
    additional,
  };
}

export interface UserProfileAccessShape {
  id: string;
  auth_user_id: string | null;
  role: "user" | "admin" | null;
  organization_id: string | null;
  organization_role: string | null;
}

export function createOrganizationSummaryFromRow(
  row:
    | (Record<string, unknown> & {
        id: string;
        name: string;
        slug?: string | null;
        billing_plan: string;
        seats_limit?: number | null;
        documents_limit?: number | null;
        metadata?: unknown;
      })
    | null
    | undefined,
): OrganizationSummary | null {
  if (!row) {
    return null;
  }

  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  const seatsLimit =
    typeof row.seats_limit === "number" && Number.isFinite(row.seats_limit)
      ? row.seats_limit
      : null;
  const documentsLimit =
    typeof row.documents_limit === "number" &&
    Number.isFinite(row.documents_limit)
      ? row.documents_limit
      : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    billingPlan: row.billing_plan,
    seatsLimit: seatsLimit ?? 0,
    documentsLimit: documentsLimit ?? 0,
    metadata,
  };
}

export function buildUserAccessContext(
  profile: UserProfileAccessShape,
  organization: OrganizationSummary | null,
): UserAccessContext {
  const organizationRole: OrganizationRole | null =
    profile.organization_role === "org_admin"
      ? "org_admin"
      : profile.organization_role === "member"
        ? "member"
        : null;

  const isMaigonAdmin = profile.role === "admin";

  return {
    profileId: profile.id,
    authUserId: profile.auth_user_id,
    maigonRole: isMaigonAdmin ? "admin" : "user",
    isMaigonAdmin,
    organizationId: profile.organization_id,
    organizationRole,
    organization,
    quotas: resolveOrganizationQuotas(organization),
  };
}

export interface OrgOverviewMetrics {
  organizationId: string;
  ingestions: {
    total: number;
    byStatus: Record<string, number>;
  };
  reviews: {
    total: number;
    byType: Record<string, number>;
    averageScore: number | null;
  };
  analysis: {
    total: number;
    fallbackCount: number;
    fallbackRate: number;
    byModel: Record<string, number>;
  };
  agentUsage: {
    totalInteractions: number;
    fallbackInteractions: number;
    approvedEdits: number;
    averageLatencyMs: number | null;
  };
}

export interface OrgMemberSummary {
  userId: string;
  name: string;
  email: string;
  organizationRole: OrganizationRole | null;
  isActive: boolean;
  usage: {
    contractsReviewed: number;
    riskAssessmentsCompleted: number;
    complianceChecksCompleted: number;
    lastActivity: string | null;
  };
  openActionItems: number;
}

export interface OrgComplianceExportItem {
  id: string;
  interactionId: string | null;
  userId: string;
  userEmail: string | null;
  contractId: string | null;
  reviewId: string | null;
  clauseReference: string | null;
  changeType: string | null;
  suggestedText: string | null;
  rationale: string | null;
  acceptedAt: string;
  provider: string | null;
  model: string | null;
}

export interface OrgAlertPreferences {
  notifyHighRisk: boolean;
  notifyPendingEdits: boolean;
  alertChannel: string;
  lastDigestAt: string | null;
}

export interface OrgAlertSummaryItem {
  contractId: string | null;
  reviewId: string;
  title: string | null;
  severity: string;
  updatedAt: string | null;
}

export interface OrgAlertSummary {
  organizationId: string;
  highRiskCount: number;
  highRiskItems: OrgAlertSummaryItem[];
  pendingAgentEdits: number;
  fallbackInteractions: number;
  generatedAt: string;
}

export interface OrgAdminProfileSummary {
  id: string;
  email: string;
  name: string;
}

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  slug: string | null;
  billingPlan: string;
  seatsLimit: number;
  seatsUsed: number;
  documentsLimit: number;
  documentsUsed: number;
  alertPreferences: OrgAlertPreferences | null;
  admins: OrgAdminProfileSummary[];
  createdAt: string;
}

export interface UserPlanSummary {
  key: string;
  name: string;
  price: number;
  billingCycle: string;
  quotas: {
    contractsLimit: number;
    documentsLimit?: number;
    seatsLimit?: number;
  };
  updatedAt: string | null;
}

export interface PaygBalanceSnapshot {
  creditsBalance: number;
  creditsPurchased: number;
  creditsConsumed: number;
  updatedAt: string | null;
}

export interface PaygLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PaygBalanceResponse {
  balance: PaygBalanceSnapshot;
  ledger: PaygLedgerEntry[];
}

export interface PaygConsumeRequest {
  userId: string;
  amount?: number;
  reason?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaygConsumeResponse {
  balance: PaygBalanceSnapshot;
}

export interface AgentDraftSuggestion {
  id: string;
  description: string;
  severity?: string;
  department?: string;
  owner?: string;
  dueTimeline?: string;
  proposedEdit?: {
    id: string;
    clauseId?: string | null;
    clauseTitle?: string | null;
    anchorText: string;
    proposedText: string;
    previousText?: string | null;
    updatedText?: string | null;
    previewHtml?: {
      previous?: string;
      updated?: string;
      diff?: string;
    };
  };
}

export interface AgentDraftEdit {
  id: string;
  clauseReference?: string | null;
  changeType?: string | null;
  originalText?: string | null;
  suggestedText: string;
  rationale?: string;
}

export interface AgentDraftRequest {
  contractId: string;
  suggestions: AgentDraftSuggestion[];
  agentEdits?: AgentDraftEdit[];
}

export interface AgentDraftResponse {
  updatedContract: string;
  originalContract?: string;
  updatedHtml?: string;
  originalHtml?: string;
  summary?: string;
  appliedChanges?: string[];
  provider?: string | null;
  model?: string | null;
  draftId?: string | null;
  assetRef?: StorageObjectRef | null;
  htmlSource?: "patched" | "llm" | "original" | "cached" | "fallback";
  cacheStatus?: "hit" | "miss";
}

export type AgentDraftJobStatus = "pending" | "running" | "succeeded" | "failed";

export interface AgentDraftJobStartResponse {
  jobId: string;
  status: AgentDraftJobStatus;
  draftKey?: string | null;
  contractId?: string;
}

export interface AgentDraftJobStatusResponse {
  jobId: string;
  status: AgentDraftJobStatus;
  draftKey?: string | null;
  contractId?: string;
  result?: AgentDraftResponse | null;
  error?: string | null;
  updatedAt?: string | null;
}

export interface CreateCheckoutSessionRequest {
  planKey: PlanKey;
  userId: string;
  email?: string;
  quantity?: number;
  organizationId?: string;
  successPath?: string;
  cancelPath?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionResponse {
  id: string;
  url: string | null;
}

export interface UserUsageSummary {
  contractsReviewed: number;
  riskAssessmentsCompleted: number;
  complianceChecksCompleted: number;
  lastActivity: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: "user" | "admin" | "org_admin";
  isActive: boolean;
  createdAt: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    role: "member" | "org_admin" | null;
  } | null;
  plan: UserPlanSummary | null;
  usage: UserUsageSummary | null;
}

export type AdminDashboardTimeSeriesPoint = {
  date: string;
  value: number;
  previous?: number | null;
};

export type AdminDashboardPlanBreakdownItem = {
  planKey: string;
  planName: string;
  users: number;
  revenueEur: number;
};

export type AdminDashboardTopUser = {
  userId: string;
  name: string;
  email: string | null;
  company: string | null;
  contractsReviewed: number;
  totalPagesReviewed: number;
  lastActivity: string | null;
};

export type AdminDashboardSolutionSummary = {
  id: string;
  name: string;
  contractType: string | null;
  isActive: boolean;
  usageCount: number;
  lastUpdated: string | null;
};

export interface AdminDashboardAnalytics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    contractsReviewed: number;
    totalRevenueEur: number;
    userGrowthPct: number | null;
    revenueGrowthPct: number | null;
    contractsGrowthPct: number | null;
  };
  timeSeries: {
    last7Days: {
      users: AdminDashboardTimeSeriesPoint[];
      contracts: AdminDashboardTimeSeriesPoint[];
      revenue: AdminDashboardTimeSeriesPoint[];
    };
    last30Days: {
      users: AdminDashboardTimeSeriesPoint[];
      contracts: AdminDashboardTimeSeriesPoint[];
      revenue: AdminDashboardTimeSeriesPoint[];
    };
  };
  plans: AdminDashboardPlanBreakdownItem[];
  geography: Array<{ country: string; users: number }>;
  contractStatus: Array<{ status: string; count: number }>;
  topUsers: AdminDashboardTopUser[];
  solutions: AdminDashboardSolutionSummary[];
  platformMetrics: {
    usage: Array<{ month: string; contracts: number; users: number; revenue: number }>;
    contractTypes: Array<{ type: string; count: number; percentage?: number }>;
    performance: {
      avgProcessingTimeSeconds: number | null;
      successRatePct: number | null;
      errorRatePct: number | null;
      apiUptimePct: number | null;
    };
    topFeatures: Array<{ key: string; label: string; usage: number }>;
  };
  userMetrics: {
    retention: Array<{ period: string; rate: number }>;
  };
  errors: Array<{ code: string; count: number }>;
  updatedAt: string;
};

export interface EnterpriseDashboardResponse {
  organization: {
    id: string;
    name: string;
    planKey: string | null;
    planName: string | null;
    seatsLimit: number | null;
    documentsLimit: number | null;
  };
  overview: {
    totalMembers: number;
    activeMembers: number;
    contractsTotal: number;
    contractsThisQuarter: number;
    autoGeneratedReports: number;
    recentReviews: number;
  };
  adoption: Array<{ label: string; value: number; hint?: string | null }>;
  risk: {
    fallbackRatePct: number | null;
    statusBreakdown: Array<{ status: string; count: number }>;
  };
  recentContracts: Array<{
    id: string;
    title: string;
    status: string | null;
    createdAt: string | null;
    owner: string | null;
  }>;
  updatedAt: string;
}

export interface OrgInviteLinkSummary {
  id: string;
  token: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  status: "pending" | "accepted" | "expired" | "cancelled";
  planKey: string;
  planName: string;
  planQuota: Record<string, unknown>;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  createdBy?: {
    authUserId: string | null;
    email?: string | null;
  } | null;
  inviteUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface OrgMemberInviteSummary {
  id: string;
  token: string;
  email: string;
  organizationId: string;
  organizationRole: "member" | "org_admin";
  status: "pending" | "accepted" | "expired" | "cancelled";
  invitedBy?: {
    profileId: string | null;
    name: string | null;
    email: string | null;
  } | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  inviteUrl?: string;
  metadata?: Record<string, unknown>;
}

export type InviteTokenType = "org_trial" | "org_member";

export interface InviteTokenSummary {
  inviteType: InviteTokenType;
  email: string;
  planKey: string | null;
  planName: string | null;
  planQuota: {
    contractsLimit?: number | null;
    documentsLimit?: number | null;
    seatsLimit?: number | null;
  } | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationRole?: "member" | "org_admin" | null;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string | null;
  prospectName?: string | null;
  prospectCompany?: string | null;
  makeOrgAdmin?: boolean;
}

export interface InviteAcceptanceRequest {
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  acceptTerms?: boolean;
  optInUpdates?: boolean;
}

export interface InviteAcceptanceResponse {
  userId: string;
  organizationId: string | null;
  planKey: string | null;
  planName: string | null;
  planQuota: {
    contractsLimit?: number | null;
    documentsLimit?: number | null;
    seatsLimit?: number | null;
  } | null;
  inviteStatus: "accepted";
}

export type InviteOrganizationMode = "existing" | "new" | "none";

export interface InvitePlanOverrides {
  contractsLimit?: number;
  documentsLimit?: number;
  seatsLimit?: number;
}

export interface CreateInviteLinkRequest {
  email: string;
  prospectName?: string;
  prospectCompany?: string;
  planKey: string;
  planOverrides?: InvitePlanOverrides;
  expiresInDays?: number;
  organizationMode: InviteOrganizationMode;
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

export interface TrialWorkspaceBootstrapSummary {
  sampleUserId: string | null;
  seededContracts: number;
  seededReviews: number;
  seededActivities: number;
  skipped: boolean;
}

export interface CreateInviteLinkResponse {
  invite: OrgInviteLinkSummary;
  organizationId: string | null;
  organizationCreated: boolean;
  bootstrap: TrialWorkspaceBootstrapSummary | null;
}
