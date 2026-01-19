import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import type { EnterpriseDashboardResponse } from "@shared/api";
import {
  SOLUTION_DISPLAY_NAMES,
  type SolutionKey,
} from "@/utils/solutionMapping";
import { getSolutionIcon } from "@/utils/solutionIcons";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type AdoptionMetric = EnterpriseDashboardResponse["adoption"][number];

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return numberFormatter.format(value);
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "€0";
  return currencyFormatter.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[#271D1D]/20 rounded-lg py-8 text-center text-sm text-[#725A5A]">
      {message}
    </div>
  );
}

function AdoptionCard({ metric }: { metric: AdoptionMetric }) {
  return (
    <div className="rounded-xl border border-[#E8DDDD] bg-[#F9F8F8] p-4 space-y-1">
      <p className="text-xs uppercase tracking-wide text-[#725A5A]">
        {metric.label}
      </p>
      <p className="text-2xl font-semibold text-[#271D1D]">{metric.value}</p>
      {metric.hint && <p className="text-xs text-[#9A7C7C]">{metric.hint}</p>}
    </div>
  );
}

export default function EnterpriseDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useUser();
  const [dashboard, setDashboard] = useState<EnterpriseDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationIdFromQuery = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const value = search.get("organizationId");
    return value?.trim() || null;
  }, [location.search]);

  const fallbackOrganizationId =
    user?.organization?.id ?? user?.access?.organizationId ?? null;
  const organizationId = organizationIdFromQuery ?? fallbackOrganizationId;

  const canView = Boolean(user && (user.isOrgAdmin || user.isMaigonAdmin));
  const requiresOrganizationSelection = canView && !organizationId;
  const isInitialLoading = (authLoading || isLoading) && !dashboard;

  const loadDashboard = useCallback(
    async (options?: { skipSpinner?: boolean }) => {
      if (!user?.authUserId || !canView || !organizationId) return;
      if (!options?.skipSpinner) setIsLoading(true);
      setError(null);
      try {
        const data = await DataService.enterpriseDashboard.fetchEnterpriseDashboard(
          user.authUserId,
          organizationId,
        );
        setDashboard(data);
      } catch (err) {
        console.error("[enterprise-dashboard] failed to load", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load enterprise dashboard.",
        );
      } finally {
        if (!options?.skipSpinner) setIsLoading(false);
      }
    },
    [user?.authUserId, canView, organizationId],
  );

  useEffect(() => {
    if (!canView || !organizationId) return;
    void loadDashboard();
  }, [canView, organizationId, loadDashboard]);

  const [showAllQuickSolutions, setShowAllQuickSolutions] = useState(false);

  const organizationName =
    dashboard?.organization.name ??
    user?.organization?.name ??
    (organizationId ? `Organisation ${organizationId.slice(0, 6)}…` : "Enterprise Partner");

  const quickAccessSolutions = useMemo(
    () => [
      {
        key: "dpa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.dpa,
        description: "Launch a privacy compliance review instantly.",
        icon: getSolutionIcon("dpa"),
      },
      {
        key: "nda" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.nda,
        description: "Assess confidentiality obligations for enterprise partners.",
        icon: getSolutionIcon("nda"),
      },
      {
        key: "psa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.psa,
        description: "Review supply agreements for delivery & liability gaps.",
        icon: getSolutionIcon("psa"),
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
        icon: getSolutionIcon(key as SolutionKey),
      })),
    [],
  );

  const visibleQuickSolutions = showAllQuickSolutions
    ? allQuickSolutions
    : quickAccessSolutions;

  const summaryCards = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        title: "Total Members",
        value: formatNumber(dashboard.overview.totalMembers),
        hint: "All invited team members",
        icon: <Users className="w-5 h-5" />,
      },
      {
        title: "Active Members",
        value: formatNumber(dashboard.overview.activeMembers),
        hint: "Users active within 30 days",
        icon: <TrendingUp className="w-5 h-5" />,
      },
      {
        title: "Contracts (All time)",
        value: formatNumber(dashboard.overview.contractsTotal),
        hint: "Completed reviews to date",
        icon: <FileText className="w-5 h-5" />,
      },
      {
        title: "Contracts (QTD)",
        value: formatNumber(dashboard.overview.contractsThisQuarter),
        hint: "Quarter-to-date total",
        icon: <Briefcase className="w-5 h-5" />,
      },
      {
        title: "AI Reports",
        value: formatNumber(dashboard.overview.autoGeneratedReports),
        hint: "Reports generated automatically",
        icon: <Layers className="w-5 h-5" />,
      },
      {
        title: "Recent Reviews",
        value: formatNumber(dashboard.overview.recentReviews),
        hint: "Last 30 days",
        icon: <BarChart3 className="w-5 h-5" />,
      },
    ];
  }, [dashboard]);

  const adoptionMetrics = dashboard?.adoption ?? [];
  const riskStatuses = dashboard?.risk.statusBreakdown ?? [];
  const fallbackRate = dashboard?.risk.fallbackRatePct ?? null;
  const recentContracts = dashboard?.recentContracts ?? [];

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
              {dashboard?.organization.planName ?? user?.plan?.name ?? "Enterprise"}
            </p>
            <p className="text-sm font-medium text-[#271D1D]">
              {organizationName}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C]"
            onClick={() => loadDashboard({ skipSpinner: true })}
            disabled={!canView || !organizationId || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 lg:px-16 py-10 space-y-8">
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Couldn’t load organisation data</p>
              <p className="text-xs">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDashboard()}
              className="border-red-300 text-red-700"
            >
              Retry
            </Button>
          </div>
        )}

        {!authLoading && !user && (
          <EmptyState message="Please sign in to access the enterprise dashboard." />
        )}

        {!authLoading && user && !canView && (
          <div className="space-y-4">
            <EmptyState message="Access restricted. Enterprise analytics are available to organisation admins and Maigon administrators." />
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/user-dashboard">Return to personal dashboard</Link>
              </Button>
            </div>
          </div>
        )}

        {requiresOrganizationSelection && (
          <EmptyState message="Select an organisation to view enterprise analytics. Maigon admins can pass ?organizationId=… in the URL." />
        )}

        {isInitialLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#9A7C7C] animate-spin" />
          </div>
        )}

        {!isInitialLoading && dashboard && (
          <>
            <section className="bg-white border border-[#E8DDDD] rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9A7C7C] mb-1">
                    Enterprise Control Centre
                  </p>
                  <h1 className="text-3xl lg:text-4xl font-lora text-[#271D1D]">
                    {organizationName} Overview
                  </h1>
                  <p className="text-sm text-[#725A5A] max-w-2xl">
                    Track adoption, contract velocity, and risk posture for the organisation’s workspace. Use this panel to inform quarterly reviews and guide remediation actions.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-[#725A5A]">
                    <span className="font-semibold text-[#271D1D]">Org ID:</span>{" "}
                    {dashboard.organization.id}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full border border-[#271D1D]/15 px-3 py-1 text-xs text-[#725A5A]">
                      Plan: {dashboard.organization.planName ?? "Custom"}
                    </div>
                    {dashboard.organization.seatsLimit && (
                      <div className="rounded-full border border-[#271D1D]/15 px-3 py-1 text-xs text-[#725A5A]">
                        Seats: {dashboard.organization.seatsLimit}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {summaryCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-xl border border-[#E8DDDD] bg-[#F9F8F8] p-4 flex items-start gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#725A5A]">
                        {card.title}
                      </p>
                      <p className="text-2xl font-semibold text-[#271D1D]">
                        {card.value}
                      </p>
                      <p className="text-xs text-[#9A7C7C]">{card.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

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

            <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
              <div className="bg-white border border-[#E8DDDD] rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#271D1D]">
                      Adoption Snapshot
                    </h2>
                    <p className="text-sm text-[#725A5A]">
                      Engagement across legal teams and business stakeholders.
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adoptionMetrics.length === 0 ? (
                    <EmptyState message="No adoption metrics available." />
                  ) : (
                    adoptionMetrics.map((metric) => (
                      <AdoptionCard key={metric.label} metric={metric} />
                    ))
                  )}
                </div>
                <div className="rounded-xl border border-[#F2D6C9] bg-[#FDF7F4] p-4">
                  <p className="text-sm font-medium text-[#9A7C7C] mb-1">Workflow spotlight</p>
                  <p className="text-sm text-[#725A5A]">
                    Enable rule-based routing to automatically approve low-risk contracts and escalate flagged agreements to your central legal team.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E8DDDD] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#271D1D]">
                      Risk & Escalation
                    </h2>
                    <p className="text-sm text-[#725A5A]">
                      Monitor fallbacks and status distribution across analyses.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#9A7C7C]/20 bg-[#9A7C7C]/5 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-[#725A5A]">Fallback rate</span>
                  <span className="text-lg font-semibold text-[#271D1D]">
                    {fallbackRate !== null ? `${fallbackRate}%` : "—"}
                  </span>
                </div>
                {riskStatuses.length === 0 ? (
                  <EmptyState message="No analysis records for the selected window." />
                ) : (
                  <div className="space-y-3">
                    {riskStatuses.map((status) => (
                      <div
                        key={status.status}
                        className="flex items-center justify-between rounded-xl border border-[#E8DDDD] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#271D1D] capitalize">
                            {status.status}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#271D1D]">
                          {formatNumber(status.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
              <div className="bg-white border border-[#E8DDDD] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#271D1D]">
                      Recent Contracts
                    </h2>
                    <p className="text-sm text-[#725A5A]">
                      Latest matters flowing through the organisation.
                    </p>
                  </div>
                </div>
                {recentContracts.length === 0 ? (
                  <EmptyState message="No contracts available yet." />
                ) : (
                  <div className="space-y-3">
                    {recentContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="rounded-xl border border-[#E8DDDD] px-4 py-3 flex items-start justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#271D1D] line-clamp-1">
                            {contract.title || "Untitled contract"}
                          </p>
                          <p className="text-xs text-[#725A5A]">
                            {formatDateTime(contract.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-[#9A7C7C]">
                            {contract.status || "pending"}
                          </p>
                          <p className="text-xs text-[#725A5A]">
                            {contract.owner ?? "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#E8DDDD] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#271D1D]">
                      Plan & Quotas
                    </h2>
                    <p className="text-sm text-[#725A5A]">
                      Current allocation for the organisation.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#E8DDDD] px-4 py-3">
                    <p className="text-xs text-[#725A5A] uppercase tracking-wide">
                      Plan
                    </p>
                    <p className="text-sm font-medium text-[#271D1D]">
                      {dashboard.organization.planName ?? "Custom pricing"}
                    </p>
                    <p className="text-xs text-[#9A7C7C]">
                      Key: {dashboard.organization.planKey ?? "n/a"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E8DDDD] px-4 py-3">
                    <p className="text-xs text-[#725A5A] uppercase tracking-wide">
                      Seats limit
                    </p>
                    <p className="text-sm font-medium text-[#271D1D]">
                      {dashboard.organization.seatsLimit ?? "Not set"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E8DDDD] px-4 py-3">
                    <p className="text-xs text-[#725A5A] uppercase tracking-wide">
                      Documents limit
                    </p>
                    <p className="text-sm font-medium text-[#271D1D]">
                      {dashboard.organization.documentsLimit ?? "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {!isInitialLoading && canView && organizationId && !dashboard && !error && (
          <EmptyState message="No enterprise data is available for this organisation yet." />
        )}
      </main>

      <Footer />
    </div>
  );
}
