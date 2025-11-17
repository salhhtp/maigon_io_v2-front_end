import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/SupabaseUserContext";
import { getDefaultDashboardRoute } from "@/utils/navigation";
import OrgAdminService from "@/services/orgAdminService";
import type {
  OrgAlertPreferences,
  OrgAlertSummary,
  OrgComplianceExportItem,
  OrgMemberSummary,
  OrgOverviewMetrics,
} from "@shared/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import {
  Download,
  FileJson2,
  Users,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Bell,
  ShieldCheck,
  Layers,
  FileText,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OrgMemberInvitesPanel from "@/components/admin/OrgMemberInvitesPanel";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import {
  SOLUTION_DISPLAY_NAMES,
  type SolutionKey,
} from "@/utils/solutionMapping";

const STAT_CARD_CLASSES =
  "flex flex-col gap-2 rounded-xl border border-[#E8DDDD] bg-white p-6 shadow-sm";

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
  } catch {
    return value;
  }
}

const severityLabels: Array<{ key: string; label: string; color: string }> = [
  { key: "critical", label: "Critical", color: "bg-red-500" },
  { key: "high", label: "High", color: "bg-orange-500" },
  { key: "medium", label: "Medium", color: "bg-yellow-500" },
  { key: "low", label: "Low", color: "bg-emerald-500" },
];

const OrgAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isLoggedIn } = useUser();
  const queryClient = useQueryClient();

  const organizationId = user?.organization?.id ?? null;
  const authUserId = user?.authUserId ?? null;
  const canView = Boolean(user?.isOrgAdmin || user?.isMaigonAdmin);

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !user)) {
      navigate("/signin", { replace: true });
    }
  }, [isLoading, isLoggedIn, user, navigate]);

  useEffect(() => {
    if (!isLoading && user && isLoggedIn && !canView) {
      const target = getDefaultDashboardRoute(user);
      navigate(target, { replace: true });
    }
  }, [canView, isLoading, isLoggedIn, navigate, user]);

  const [memberFilter, setMemberFilter] = useState("");
  const [showAllQuickSolutions, setShowAllQuickSolutions] = useState(false);

  const overviewQuery = useQuery<OrgOverviewMetrics>({
    queryKey: ["org-overview", organizationId],
    queryFn: () =>
      OrgAdminService.getOverview(organizationId!, authUserId!),
    enabled: Boolean(organizationId && authUserId && canView),
  });

  const membersQuery = useQuery<OrgMemberSummary[]>({
    queryKey: ["org-members", organizationId],
    queryFn: () => OrgAdminService.getMembers(organizationId!, authUserId!),
    enabled: Boolean(organizationId && authUserId && canView),
  });

  const complianceQuery = useQuery<OrgComplianceExportItem[]>({
    queryKey: ["org-compliance", organizationId],
    queryFn: () =>
      OrgAdminService.getComplianceItems(organizationId!, authUserId!),
    enabled: Boolean(organizationId && authUserId && canView),
  });

  const insightsQuery = useQuery({
    queryKey: ["org-review-insights", organizationId],
    queryFn: () => OrgAdminService.getReviewInsights(organizationId!),
    enabled: Boolean(organizationId && canView),
  });

  const alertPreferencesQuery = useQuery<OrgAlertPreferences>({
    queryKey: ["org-alert-prefs", organizationId],
    queryFn: () =>
      OrgAdminService.getAlertPreferences(organizationId!, authUserId!),
    enabled: Boolean(organizationId && authUserId && canView),
  });

  const alertSummaryQuery = useQuery<OrgAlertSummary>({
    queryKey: ["org-alert-summary", organizationId],
    queryFn: () =>
      OrgAdminService.getAlertSummary(organizationId!, authUserId!),
    enabled: Boolean(organizationId && authUserId && canView),
  });

  const updateAlertPrefsMutation = useMutation({
    mutationFn: (updates: Partial<OrgAlertPreferences>) =>
      OrgAdminService.updateAlertPreferences(
        organizationId!,
        authUserId!,
        updates,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-alert-prefs", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["org-alert-summary", organizationId],
      });
    },
  });

  const refreshDashboard = useCallback(() => {
    if (!organizationId) return;
    const keys: Array<[string, string]> = [
      ["org-overview", organizationId],
      ["org-members", organizationId],
      ["org-compliance", organizationId],
      ["org-review-insights", organizationId],
      ["org-alert-prefs", organizationId],
      ["org-alert-summary", organizationId],
    ];
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [organizationId, queryClient]);

  const quickAccessSolutions = useMemo(
    () => [
      {
        key: "dpa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.dpa,
        description: "Launch a privacy compliance review instantly.",
        icon: <ShieldCheck className="w-5 h-5 text-[#9A7C7C]" />,
      },
      {
        key: "nda" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.nda,
        description: "Assess confidentiality obligations for partners.",
        icon: <FileText className="w-5 h-5 text-[#9A7C7C]" />,
      },
      {
        key: "psa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.psa,
        description: "Review supplier agreements for delivery & liability gaps.",
        icon: <Layers className="w-5 h-5 text-[#9A7C7C]" />,
      },
    ],
    [],
  );

  const handleQuickAccess = useCallback(
    (solutionKey: SolutionKey) => {
      const solutionTitle = SOLUTION_DISPLAY_NAMES[solutionKey];
      navigate("/perspective-selection", {
        state: {
          solutionId: solutionKey,
          solutionKey,
          solutionTitle,
          quickUpload: true,
          adminAccess: Boolean(user?.isMaigonAdmin),
          organizationId,
        },
      });
    },
    [navigate, organizationId, user?.isMaigonAdmin],
  );

  const allQuickSolutions = useMemo(
    () =>
      Object.entries(SOLUTION_DISPLAY_NAMES).map(([key, name]) => ({
        key: key as SolutionKey,
        name,
        description: "Launch a review tailored to this contract type.",
        icon: <Layers className="w-5 h-5 text-[#9A7C7C]" />,
      })),
    [],
  );

  const visibleQuickSolutions = showAllQuickSolutions
    ? allQuickSolutions
    : quickAccessSolutions;

  const filteredMembers = useMemo(() => {
    const members = membersQuery.data ?? [];
    const trimmed = memberFilter.trim().toLowerCase();
    if (!trimmed) return members;
    return members.filter((member) => {
      const haystack = [
        member.name,
        member.email,
        member.organizationRole ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [memberFilter, membersQuery.data]);

  const totalMembers = membersQuery.data?.length ?? 0;
  const activeMembers =
    membersQuery.data?.filter((member) => member.isActive).length ?? 0;

  const overview = overviewQuery.data;
  const insights = insightsQuery.data;
  const complianceItems = complianceQuery.data ?? [];
  const alertPreferences = alertPreferencesQuery.data;
  const alertSummary = alertSummaryQuery.data;

  const severityTotal =
    insights?.totalPrioritized ??
    severityLabels.reduce(
      (sum, item) => sum + (insights?.severity[item.key] ?? 0),
      0,
    );

  const hasDataLoaded =
    overviewQuery.isSuccess &&
    membersQuery.isSuccess &&
    insightsQuery.isSuccess &&
    alertPreferencesQuery.isSuccess;

  const isFetching =
    overviewQuery.isFetching ||
    membersQuery.isFetching ||
    insightsQuery.isFetching ||
    complianceQuery.isFetching ||
    alertPreferencesQuery.isFetching ||
    alertSummaryQuery.isFetching;

  const overviewLoading = !overview && overviewQuery.isLoading;
  const membersLoading = !membersQuery.data && membersQuery.isLoading;
  const alertPrefsLoading = !alertPreferences && alertPreferencesQuery.isLoading;
  const alertSummaryLoading = !alertSummary && alertSummaryQuery.isLoading;

  if (!organizationId && !isLoading && canView) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center px-6 py-12">
        <div className="max-w-lg bg-white border border-[#E8DDDD] rounded-xl shadow-sm p-10 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-[#271D1D]">
            No organization linked to your account
          </h1>
          <p className="text-sm text-[#6B7280] leading-relaxed">
            To access the organization dashboard, please make sure your profile
            is associated with an organization. Contact Maigon support if you
            need assistance.
          </p>
          <Button onClick={() => navigate("/profile")} variant="outline">
            Review profile settings
          </Button>
        </div>
      </div>
    );
  }

  if (!canView && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex flex-col">
      <header className="flex items-center justify-between px-6 lg:px-16 py-6 border-b border-[#E8DDDD] bg-white">
        <Link
          to="/home"
          className="focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] rounded"
        >
          <Logo size="xl" />
        </Link>
        <div className="md:hidden">
          <MobileNavigation
            isLoggedIn={Boolean(user)}
            userName={user?.name?.split(" ")[0]}
          />
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-[#725A5A]">
              {user?.organization?.name ?? "Organization Admin"}
            </p>
            <p className="text-sm font-medium text-[#271D1D]">
              {user?.name ?? user?.email ?? "—"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C]"
            onClick={refreshDashboard}
            disabled={!organizationId || isFetching}
          >
            {isFetching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="sm"
            className="bg-[#271D1D] hover:bg-[#271D1D]/80"
            onClick={() => navigate("/upload")}
          >
            Upload contract
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:px-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#271D1D]">
                Organization Insights
              </h1>
              <p className="text-sm text-[#6B7280]">
                {user?.organization?.name ?? "Your organization"}
                {overview ? " • Updated moments ago" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const payload = JSON.stringify(complianceItems, null, 2);
                  OrgAdminService.triggerDownload(
                    payload,
                    `org-${organizationId}-compliance.json`,
                    "application/json",
                  );
                }}
                disabled={!complianceItems.length}
                className="flex items-center gap-2"
              >
                <FileJson2 className="h-4 w-4" />
                Export JSON
              </Button>
              <Button
                onClick={() => {
                  const csv = OrgAdminService.buildCsv(complianceItems);
                  OrgAdminService.triggerDownload(
                    csv,
                    `org-${organizationId}-compliance.csv`,
                    "text/csv",
                  );
                }}
                disabled={!complianceItems.length}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
          {(overviewQuery.isError ||
            membersQuery.isError ||
            insightsQuery.isError ||
            complianceQuery.isError) && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Some data failed to load. Please refresh the page or try again in
              a few moments.
            </div>
          )}
        </div>

        <section className="bg-gradient-to-br from-[#FDF1F1] via-[#F9E8E8] to-[#FDEDEA] border border-[#E8CACA] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#9A7C7C]">
                Quick Access
              </p>
              <h2 className="text-xl font-lora text-[#271D1D]">
                Launch contract reviews instantly
              </h2>
              <p className="text-sm text-[#725A5A]">
                Pick a solution and jump straight into the upload flow.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#9A7C7C] text-[#9A7C7C]"
                onClick={() => setShowAllQuickSolutions((prev) => !prev)}
              >
                {showAllQuickSolutions ? "Collapse" : "Show all"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#9A7C7C] text-[#9A7C7C]"
                onClick={() => navigate("/user-solutions")}
              >
                Browse all solutions
              </Button>
            </div>
          </div>
          <div
            className={`grid grid-cols-1 ${
              showAllQuickSolutions ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-3"
            } gap-4`}
          >
            {visibleQuickSolutions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleQuickAccess(item.key)}
                className="text-left bg-white border border-[#271D1D]/10 rounded-xl p-4 hover:border-[#9A7C7C]/40 hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#9A7C7C]"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#271D1D] font-lora">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#725A5A] leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xl" />
            ))
          ) : (
            <>
              <div className={STAT_CARD_CLASSES}>
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wide text-[#6B7280]">
                    Documents Ingested
                  </span>
                  <Users className="h-5 w-5 text-[#9A7C7C]" />
                </div>
                <p className="text-3xl font-semibold text-[#271D1D]">
                  {formatNumber(overview?.ingestions.total)}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {Object.keys(overview?.ingestions.byStatus ?? {}).length} statuses
                  tracked
                </p>
              </div>
              <div className={STAT_CARD_CLASSES}>
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wide text-[#6B7280]">
                    Reviews Completed
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-[#9A7C7C]" />
                </div>
                <p className="text-3xl font-semibold text-[#271D1D]">
                  {formatNumber(overview?.reviews.total)}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Avg. score {formatNumber(overview?.reviews.averageScore)}
                </p>
              </div>
              <div className={STAT_CARD_CLASSES}>
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wide text-[#6B7280]">
                    Fallback Rate
                  </span>
                  <Activity className="h-5 w-5 text-[#9A7C7C]" />
                </div>
                <p className="text-3xl font-semibold text-[#271D1D]">
                  {formatPercentage(overview?.analysis.fallbackRate)}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {formatNumber(overview?.analysis.fallbackCount)} fallbacks of{" "}
                  {formatNumber(overview?.analysis.total)} total runs
                </p>
              </div>
              <div className={STAT_CARD_CLASSES}>
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wide text-[#6B7280]">
                    Agent Interactions
                  </span>
                  <Users className="h-5 w-5 text-[#9A7C7C]" />
                </div>
                <p className="text-3xl font-semibold text-[#271D1D]">
                  {formatNumber(overview?.agentUsage.totalInteractions)}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {formatNumber(overview?.agentUsage.approvedEdits)} edits approved •{" "}
                  {formatNumber(overview?.agentUsage.fallbackInteractions)} fallbacks
                </p>
                <p className="text-xs text-[#6B7280]">
                  Avg latency{" "}
                  {overview?.agentUsage.averageLatencyMs
                    ? `${overview.agentUsage.averageLatencyMs} ms`
                    : "—"}
                </p>
              </div>
            </>
          )}
        </section>

        <section id="org-admin-invites-section">
          <OrgMemberInvitesPanel />
        </section>

        <section
          id="org-admin-alerts-section"
          className="grid gap-6 lg:grid-cols-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-[#271D1D]">
                Alert Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alertPrefsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-[#E8DDDD] bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-[#9A7C7C]" />
                      <div>
                        <p className="text-sm font-medium text-[#271D1D]">
                          High-risk alerts
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          Notify org admins when new critical or high severity findings appear.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={alertPreferences?.notifyHighRisk ?? true}
                      disabled={updateAlertPrefsMutation.isLoading}
                      onCheckedChange={(checked) =>
                        updateAlertPrefsMutation.mutate({
                          notifyHighRisk: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#E8DDDD] bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-[#9A7C7C]" />
                      <div>
                        <p className="text-sm font-medium text-[#271D1D]">
                          Pending agent edits digest
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          Receive periodic summaries of agent interactions that still need attention.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={alertPreferences?.notifyPendingEdits ?? false}
                      disabled={updateAlertPrefsMutation.isLoading}
                      onCheckedChange={(checked) =>
                        updateAlertPrefsMutation.mutate({
                          notifyPendingEdits: checked,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Last digest: {alertPreferences?.lastDigestAt ? formatDate(alertPreferences.lastDigestAt) : "none yet"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-[#271D1D]">
                Alerts Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alertSummaryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : alertSummary ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm text-[#271D1D]">
                    <div className="rounded-lg bg-[#F9F8F8] p-3">
                      <p className="text-xs text-[#6B7280]">High-risk findings</p>
                      <p className="text-xl font-semibold">{alertSummary.highRiskCount}</p>
                    </div>
                    <div className="rounded-lg bg-[#F9F8F8] p-3">
                      <p className="text-xs text-[#6B7280]">Pending agent edits</p>
                      <p className="text-xl font-semibold">{alertSummary.pendingAgentEdits}</p>
                    </div>
                    <div className="rounded-lg bg-[#F9F8F8] p-3">
                      <p className="text-xs text-[#6B7280]">Fallback interactions</p>
                      <p className="text-xl font-semibold">{alertSummary.fallbackInteractions}</p>
                    </div>
                    <div className="rounded-lg bg-[#F9F8F8] p-3">
                      <p className="text-xs text-[#6B7280]">Generated</p>
                      <p className="text-sm">{formatDate(alertSummary.generatedAt)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                      Recent high-risk items
                    </p>
                    {alertSummary.highRiskItems.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">
                        No recent high-risk findings.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {alertSummary.highRiskItems.map((item) => (
                          <li
                            key={item.reviewId}
                            className="flex items-start gap-3 rounded-lg border border-[#E8DDDD] bg-white px-3 py-2 text-sm"
                          >
                            <AlertTriangle className="mt-1 h-4 w-4 text-red-500" />
                            <div>
                              <p className="font-medium text-[#271D1D]">
                                {item.title ?? "Untitled contract"}
                              </p>
                              <p className="text-xs text-[#6B7280]">
                                Severity: {item.severity} • Updated {formatDate(item.updatedAt ?? alertSummary.generatedAt)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const payload = JSON.stringify(alertSummary, null, 2);
                          OrgAdminService.triggerDownload(
                            payload,
                            `org-${organizationId}-alert-summary.json`,
                            "application/json",
                          );
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download summary
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#6B7280]">
                  Alerts will appear here once preferences are enabled.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl text-[#271D1D]">
                Severity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!insights && (insightsQuery.isLoading || isFetching) ? (
                <p className="text-sm text-[#6B7280]">Loading severity data…</p>
              ) : severityTotal === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  No prioritized findings captured yet.
                </p>
              ) : (
                severityLabels.map(({ key, label, color }) => {
                  const count = insights?.severity[key] ?? 0;
                  const value =
                    severityTotal > 0 ? (count / severityTotal) * 100 : 0;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn("h-2 w-2 rounded-full", color)}
                          />
                          {label}
                        </span>
                        <span className="text-[#6B7280]">
                          {count} items • {value.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-[#271D1D]">
                Most Common Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(!insights || insights.missingClauses.length === 0) &&
              (insightsQuery.isLoading || isFetching) ? (
                <p className="text-sm text-[#6B7280]">
                  Loading missing clause data…
                </p>
              ) : insights?.missingClauses.length ? (
                <ul className="space-y-3">
                  {insights.missingClauses.map((item) => (
                    <li
                      key={`${item.clause}-${item.count}`}
                      className="rounded-lg border border-[#E8DDDD] bg-white px-3 py-2 text-sm text-[#271D1D]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {item.clause.length > 60
                            ? `${item.clause.slice(0, 60)}…`
                            : item.clause}
                        </span>
                        <Badge variant="secondary">
                          {item.count} time{item.count === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#6B7280]">
                  No missing clause findings were recorded for this
                  organization.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#271D1D]">
                Member Activity
              </h2>
              <p className="text-sm text-[#6B7280]">
                {activeMembers} active of {totalMembers} members
              </p>
            </div>
            <Input
              value={memberFilter}
              onChange={(event) => setMemberFilter(event.target.value)}
              placeholder="Filter by name, email, or role…"
              className="w-full max-w-xs bg-white"
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-[#E8DDDD] bg-white">
            <Table>
              <TableHeader className="bg-[#FBF9F8]">
                <TableRow>
                  <TableHead className="w-[220px]">Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contracts Reviewed</TableHead>
                  <TableHead>Compliance Checks</TableHead>
                  <TableHead>Open Items</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-[#6B7280]"
                    >
                      {memberFilter
                        ? "No members match your filter."
                        : "No members found for this organization yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-[#271D1D]">
                            {member.name}
                          </span>
                          <span className="text-xs text-[#6B7280]">
                            {member.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.organizationRole ?? "member"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatNumber(member.usage.contractsReviewed)}
                      </TableCell>
                      <TableCell>
                        {formatNumber(member.usage.complianceChecksCompleted)}
                      </TableCell>
                      <TableCell>{formatNumber(member.openActionItems)}</TableCell>
                      <TableCell>
                        {formatDate(member.usage.lastActivity)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {!hasDataLoaded && isFetching && (
          <div className="rounded-md border border-[#E8DDDD] bg-white px-4 py-3 text-sm text-[#6B7280]">
            Gathering your organization data…
          </div>
        )}
      </div>
    </main>
  </div>
);
};

export default OrgAdminDashboard;
