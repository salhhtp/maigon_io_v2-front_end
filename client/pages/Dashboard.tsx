import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ClipboardList,
  DollarSign,
  FileText,
  Globe,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import { SOLUTION_DISPLAY_NAMES, type SolutionKey } from "@/utils/solutionMapping";
import type {
  AdminDashboardAnalytics,
  AdminDashboardPlanBreakdownItem,
  AdminDashboardTimeSeriesPoint,
  AdminDashboardTopUser,
} from "@shared/api";
import type { CustomSolution } from "@shared/api";
import AddUserModal from "@/components/modals/AddUserModal";
import CustomSolutionModal from "@/components/modals/CustomSolutionModal";
import { getDefaultDashboardRoute } from "@/utils/navigation";
import aiService from "@/services/aiService";
import type { OrganizationSummary } from "@shared/api";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

type TimeRange = "7d" | "30d";

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  growth?: {
    label: string;
    trend: "up" | "down" | "flat";
  } | null;
  description?: string;
}

interface TimeSeriesListProps {
  title: string;
  icon: ReactNode;
  points: AdminDashboardTimeSeriesPoint[];
  formatValue: (value: number) => string;
}

type SolutionSummary = AdminDashboardAnalytics["solutions"][number];

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) {
    return `${compactNumberFormatter.format(value / 1_000_000)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${compactNumberFormatter.format(value / 1_000)}k`;
  }
  return numberFormatter.format(value);
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "€0";
  return currencyFormatter.format(value);
}

function formatGrowth(
  value: number | null | undefined,
): { label: string; trend: "up" | "down" | "flat" } | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  if (value === 0) return { label: "0%", trend: "flat" };
  const absolute = Math.abs(value);
  const label = `${value > 0 ? "+" : "-"}${percentFormatter.format(absolute)}%`;
  return { label, trend: value > 0 ? "up" : "down" };
}

function formatDateLabel(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatMonthLabel(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return monthFormatter.format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getPointDelta(
  point: AdminDashboardTimeSeriesPoint,
): { label: string; trend: "up" | "down" | "flat" } | null {
  if (point.previous === null || point.previous === undefined) return null;
  const diff = point.value - point.previous;
  if (!Number.isFinite(diff)) return null;
  if (diff === 0) return { label: "0", trend: "flat" };
  const label = `${diff > 0 ? "+" : "-"}${formatNumber(Math.abs(diff))}`;
  return { label, trend: diff > 0 ? "up" : "down" };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[#271D1D]/20 rounded-lg py-8 text-center text-sm text-[#725A5A]">
      {message}
    </div>
  );
}

function MetricCard({ title, value, icon, growth, description }: MetricCardProps) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#725A5A]">{title}</p>
          <p className="text-2xl sm:text-3xl font-lora text-[#271D1D]">{value}</p>
        </div>
      </div>
      {growth ? (
        <div
          className={`text-xs font-medium flex items-center gap-2 ${
            growth.trend === "up"
              ? "text-green-600"
              : growth.trend === "down"
                ? "text-red-600"
                : "text-[#725A5A]"
          }`}
        >
          {growth.trend === "up" ? (
            <TrendingUp className="w-4 h-4" />
          ) : growth.trend === "down" ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
          <span>{growth.label}</span>
        </div>
      ) : description ? (
        <p className="text-xs text-[#725A5A]">{description}</p>
      ) : null}
    </div>
  );
}

function TimeSeriesList({ title, icon, points, formatValue }: TimeSeriesListProps) {
  const items = points.slice(-14);

  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
            {icon}
          </div>
          <h3 className="font-lora text-lg text-[#271D1D]">{title}</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState message="No data collected for this period yet." />
      ) : (
        <div className="space-y-3">
          {items.map((point) => {
            const delta = getPointDelta(point);
            return (
              <div
                key={`${point.date}-${point.value}`}
                className="flex items-center justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-[#271D1D]">
                    {formatDateLabel(point.date)}
                  </p>
                  {point.previous !== undefined && point.previous !== null && (
                    <p className="text-xs text-[#725A5A]">
                      Prev: {formatValue(point.previous)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#271D1D]">
                    {formatValue(point.value)}
                  </p>
                  {delta && (
                    <p
                      className={`text-xs font-medium ${
                        delta.trend === "up"
                          ? "text-green-600"
                          : delta.trend === "down"
                            ? "text-red-600"
                            : "text-[#725A5A]"
                      }`}
                    >
                      {delta.label}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanBreakdown({ plans }: { plans: AdminDashboardPlanBreakdownItem[] }) {
  if (plans.length === 0) {
    return (
      <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-lora text-lg text-[#271D1D]">Plan Distribution</h3>
        </div>
        <EmptyState message="No plans assigned yet." />
      </div>
    );
  }

  const sorted = [...plans].sort((a, b) => b.users - a.users);

  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Plan Distribution</h3>
          <p className="text-xs text-[#725A5A]">
            Breakdown of active customers by plan and revenue contribution.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((plan) => (
          <div
            key={plan.planKey}
            className="flex items-start justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-[#271D1D]">{plan.planName}</p>
              <p className="text-xs uppercase tracking-wide text-[#725A5A]">
                {plan.planKey}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#271D1D]">
                {formatNumber(plan.users)} users
              </p>
              <p className="text-xs text-[#725A5A]">
                {formatCurrency(plan.revenueEur)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeographyList({ geography }: { geography: AdminDashboardAnalytics["geography"] }) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Geography</h3>
          <p className="text-xs text-[#725A5A]">
            Top regions based on active user profiles.
          </p>
        </div>
      </div>
      {geography.length === 0 ? (
        <EmptyState message="No geography data available yet." />
      ) : (
        <div className="space-y-3">
          {geography.map((item) => (
            <div key={item.country} className="flex items-center justify-between">
              <p className="text-sm text-[#271D1D]">{item.country}</p>
              <p className="text-sm font-medium text-[#271D1D]">
                {formatNumber(item.users)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractStatusList({
  statuses,
}: {
  statuses: AdminDashboardAnalytics["contractStatus"];
}) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Contract Pipeline</h3>
          <p className="text-xs text-[#725A5A]">
            Snapshot of contract lifecycle stages across the platform.
          </p>
        </div>
      </div>
      {statuses.length === 0 ? (
        <EmptyState message="No contract data available." />
      ) : (
        <div className="space-y-3">
          {statuses.map((status) => (
            <div
              key={status.status}
              className="flex items-center justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
            >
              <p className="text-sm text-[#271D1D] capitalize">{status.status}</p>
              <p className="text-sm font-semibold text-[#271D1D]">
                {formatNumber(status.count)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopUsersTable({ users }: { users: AdminDashboardTopUser[] }) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Top Users</h3>
          <p className="text-xs text-[#725A5A]">
            Users ranked by contracts reviewed and recent activity.
          </p>
        </div>
      </div>
      {users.length === 0 ? (
        <EmptyState message="No user analytics recorded yet." />
      ) : (
        <div className="space-y-3">
          {users.slice(0, 8).map((user) => (
            <div
              key={user.userId}
              className="flex items-start justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
            >
              <div className="max-w-[60%]">
                <p className="text-sm font-medium text-[#271D1D]">
                  {user.name || user.email || user.userId}
                </p>
                <p className="text-xs text-[#725A5A]">
                  {user.company || user.email || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#271D1D]">
                  {formatNumber(user.contractsReviewed)} reviews
                </p>
                <p className="text-xs text-[#725A5A]">
                  Last active {formatDateLabel(user.lastActivity?.slice(0, 10) ?? "")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SolutionsList({ solutions }: { solutions: SolutionSummary[] }) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Custom Solutions</h3>
          <p className="text-xs text-[#725A5A]">
            Usage and freshness of organisation-specific playbooks.
          </p>
        </div>
      </div>
      {solutions.length === 0 ? (
        <EmptyState message="No custom solutions have been created yet." />
      ) : (
        <div className="space-y-3">
          {solutions.slice(0, 8).map((solution) => (
            <div
              key={solution.id}
              className="flex items-start justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-[#271D1D]">{solution.name}</p>
                <p className="text-xs text-[#725A5A]">
                  {solution.contractType || "General"} • Updated{" "}
                  {formatDateLabel(solution.lastUpdated?.slice(0, 10) ?? "")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#271D1D]">
                  {formatNumber(solution.usageCount)} uses
                </p>
                <p
                  className={`text-xs font-medium ${
                    solution.isActive ? "text-green-600" : "text-[#725A5A]"
                  }`}
                >
                  {solution.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PerformanceSummary({
  performance,
  topFeatures,
}: {
  performance: AdminDashboardAnalytics["platformMetrics"]["performance"];
  topFeatures: AdminDashboardAnalytics["platformMetrics"]["topFeatures"];
}) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">System Performance</h3>
          <p className="text-xs text-[#725A5A]">
            Health metrics aggregated from analysis runs.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#271D1D]/10 px-3 py-2">
          <p className="text-xs text-[#725A5A] uppercase tracking-wide">
            Avg processing time
          </p>
          <p className="text-lg font-semibold text-[#271D1D]">
            {performance.avgProcessingTimeSeconds !== null
              ? `${performance.avgProcessingTimeSeconds}s`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-[#271D1D]/10 px-3 py-2">
          <p className="text-xs text-[#725A5A] uppercase tracking-wide">Success rate</p>
          <p className="text-lg font-semibold text-[#271D1D]">
            {performance.successRatePct !== null
              ? `${percentFormatter.format(performance.successRatePct)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-[#271D1D]/10 px-3 py-2">
          <p className="text-xs text-[#725A5A] uppercase tracking-wide">Error rate</p>
          <p className="text-lg font-semibold text-[#271D1D]">
            {performance.errorRatePct !== null
              ? `${percentFormatter.format(performance.errorRatePct)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-[#271D1D]/10 px-3 py-2">
          <p className="text-xs text-[#725A5A] uppercase tracking-wide">API uptime</p>
          <p className="text-lg font-semibold text-[#271D1D]">
            {performance.apiUptimePct !== null
              ? `${percentFormatter.format(performance.apiUptimePct)}%`
              : "—"}
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-[#725A5A] mb-2">
          Most Used Solutions
        </p>
        {topFeatures.length === 0 ? (
          <EmptyState message="No feature utilisation data available." />
        ) : (
          <div className="space-y-2">
            {topFeatures.slice(0, 6).map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between text-sm text-[#271D1D]"
              >
                <span>{feature.label || feature.key}</span>
                <span className="font-medium">{formatNumber(feature.usage)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsageList({
  usage,
}: {
  usage: AdminDashboardAnalytics["platformMetrics"]["usage"];
}) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Monthly Usage</h3>
          <p className="text-xs text-[#725A5A]">
            Combined view of contracts, users, and revenue trends.
          </p>
        </div>
      </div>
      {usage.length === 0 ? (
        <EmptyState message="No usage patterns captured yet." />
      ) : (
        <div className="space-y-3">
          {usage.map((entry) => (
            <div
              key={entry.month}
              className="flex items-center justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-[#271D1D]">
                  {formatMonthLabel(entry.month)}
                </p>
                <p className="text-xs text-[#725A5A]">
                  {formatNumber(entry.users)} users • {formatNumber(entry.contracts)} contracts
                </p>
              </div>
              <p className="text-sm font-semibold text-[#271D1D]">
                {formatCurrency(entry.revenue)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorList({ errors }: { errors: AdminDashboardAnalytics["errors"] }) {
  return (
    <div className="bg-white border border-[#271D1D]/10 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-lora text-lg text-[#271D1D]">Error Signals</h3>
          <p className="text-xs text-[#725A5A]">
            Aggregated error codes observed during analysis runs.
          </p>
        </div>
      </div>
      {errors.length === 0 ? (
        <EmptyState message="No errors recorded for the selected period." />
      ) : (
        <div className="space-y-3">
          {errors.map((error) => (
            <div
              key={error.code}
              className="flex items-center justify-between rounded-lg border border-[#271D1D]/10 px-3 py-2"
            >
              <p className="text-sm text-[#271D1D]">{error.code}</p>
              <p className="text-sm font-semibold text-[#271D1D]">
                {formatNumber(error.count)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useUser();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [customSolutionModalOpen, setCustomSolutionModalOpen] = useState(false);
  const [showAllQuickSolutions, setShowAllQuickSolutions] = useState(false);
  const [orgCustomSolutions, setOrgCustomSolutions] = useState<CustomSolution[]>([]);
  const [loadingOrgSolutions, setLoadingOrgSolutions] = useState(false);

  const loadAnalytics = useCallback(
    async (options?: { skipSpinner?: boolean }) => {
      if (!user?.authUserId || !user.isMaigonAdmin) return;
      if (!options?.skipSpinner) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const data = await DataService.adminDashboard.fetchAdminDashboard(
          user.authUserId,
          { days: 30 },
        );
        setAnalytics(data);
      } catch (err) {
        console.error("[dashboard] failed to load admin analytics", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard analytics.",
        );
      } finally {
        if (!options?.skipSpinner) {
          setIsLoading(false);
        }
      }
    },
    [user?.authUserId, user?.isMaigonAdmin],
  );

  useEffect(() => {
    if (!user?.authUserId || !user.isMaigonAdmin) return;
    void loadAnalytics();
  }, [user?.authUserId, user?.isMaigonAdmin, loadAnalytics]);

  useEffect(() => {
    if (!user?.authUserId || !user.organization?.id) {
      setOrgCustomSolutions([]);
      return;
    }

    setLoadingOrgSolutions(true);
    aiService
      .getCustomSolutions(user.authUserId, user.organization.id)
      .then((solutions) => {
        const filtered = solutions.filter(
          (solution) =>
            solution.organizationId === user.organization?.id &&
            solution.isActive !== false,
        );
        setOrgCustomSolutions(filtered);
      })
      .catch((err) => {
        console.warn("[dashboard] failed to load org custom solutions", err);
      })
      .finally(() => setLoadingOrgSolutions(false));
  }, [user?.authUserId, user?.organization?.id]);

  const handleUserAdded = useCallback(() => {
    setAddUserModalOpen(false);
    void loadAnalytics({ skipSpinner: true });
  }, [loadAnalytics]);

  const handleSolutionCreated = useCallback(() => {
    setCustomSolutionModalOpen(false);
    void loadAnalytics({ skipSpinner: true });
  }, [loadAnalytics]);

  const selectedSeries = useMemo(() => {
    if (!analytics) return null;
    return timeRange === "7d"
      ? analytics.timeSeries.last7Days
      : analytics.timeSeries.last30Days;
  }, [analytics, timeRange]);

  const overviewCards = useMemo<MetricCardProps[]>(() => {
    if (!analytics) return [];
    return [
      {
        title: "Total Users",
        value: formatNumber(analytics.overview.totalUsers),
        icon: <Users className="w-4 h-4" />,
        growth: formatGrowth(analytics.overview.userGrowthPct),
      },
      {
        title: "Active Users",
        value: formatNumber(analytics.overview.activeUsers),
        icon: <Activity className="w-4 h-4" />,
        description: "Active within the past 30 days",
      },
      {
        title: "Contracts Reviewed",
        value: formatNumber(analytics.overview.contractsReviewed),
        icon: <ClipboardList className="w-4 h-4" />,
        growth: formatGrowth(analytics.overview.contractsGrowthPct),
      },
      {
        title: "Total Revenue",
        value: formatCurrency(analytics.overview.totalRevenueEur),
        icon: <DollarSign className="w-4 h-4" />,
        growth: formatGrowth(analytics.overview.revenueGrowthPct),
      },
    ];
  }, [analytics]);

  const quickAccessSolutions = useMemo(
    () => [
      {
        key: "dpa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.dpa,
        description: "Jump straight into a data processing agreement review.",
        icon: <ShieldCheck className="w-5 h-5 text-[#9A7C7C]" />,
      },
      {
        key: "nda" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.nda,
        description: "Assess confidentiality terms and obligations within minutes.",
        icon: <FileText className="w-5 h-5 text-[#9A7C7C]" />,
      },
      {
        key: "psa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.psa,
        description: "Review supplier agreements for delivery and liability gaps.",
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
        },
      });
    },
    [navigate, user?.isMaigonAdmin],
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
  const visibleQuickSolutions = showAllQuickSolutions ? allQuickSolutions : quickAccessSolutions;

  const planItems = analytics?.plans ?? [];
  const geography = analytics?.geography ?? [];
  const contractStatuses = analytics?.contractStatus ?? [];
  const topUsers = analytics?.topUsers ?? [];
  const solutions = analytics?.solutions ?? [];
  const topFeatures = analytics?.platformMetrics.topFeatures ?? [];
  const performance = analytics?.platformMetrics.performance ?? {
    avgProcessingTimeSeconds: null,
    successRatePct: null,
    errorRatePct: null,
    apiUptimePct: null,
  };
  const usage = analytics?.platformMetrics.usage ?? [];
  const errors = analytics?.errors ?? [];
  const updatedAtLabel = analytics
    ? new Date(analytics.updatedAt).toLocaleString()
    : null;

  const canAccessEnterprise = Boolean(user?.isOrgAdmin);
  const enterpriseLink = user?.isOrgAdmin && user.organization?.id
    ? `/enterprise-dashboard?organizationId=${user.organization.id}`
    : "/enterprise-dashboard";
  const adminAnalyticsLink = user?.isMaigonAdmin ? "/admin-analytics" : null;

  const canViewDashboard = Boolean(user?.isMaigonAdmin);
  const isInitialLoading = (authLoading || isLoading) && !analytics;
  const showUnauthorized = !authLoading && user !== null && !canViewDashboard;

  useEffect(() => {
    if (!authLoading && user && !canViewDashboard) {
      const target = getDefaultDashboardRoute(user);
      navigate(target, { replace: true });
    }
  }, [authLoading, canViewDashboard, navigate, user]);

  if (!authLoading && user && !canViewDashboard) {
    return null;
  }
  const showSignInPrompt = !authLoading && !user;
  const organizationMetadata = (user?.organization?.metadata ??
    {}) as Record<string, unknown>;
  const organizationLogoUrl =
    typeof organizationMetadata.logoUrl === "string"
      ? organizationMetadata.logoUrl
      : null;

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex flex-col">
      <header className="flex items-center justify-between px-6 lg:px-16 py-6 border-b border-[#E8DDDD] bg-white">
        <div className="flex items-center gap-6">
          <Link to="/home" className="focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] rounded">
            <Logo size="xl" />
          </Link>
          {user?.organization?.name && (
            <div className="flex items-center gap-3">
              {organizationLogoUrl ? (
                <img
                  src={organizationLogoUrl}
                  alt={`${user.organization.name} logo`}
                  className="h-10 w-10 rounded-lg object-contain border border-[#E8DDDD] bg-white"
                />
              ) : null}
              <div className="leading-tight">
                <p className="text-xs uppercase tracking-[0.2em] text-[#725A5A]">Organization</p>
                <p className="text-sm font-medium text-[#271D1D]">{user.organization.name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="md:hidden">
          <MobileNavigation
            isLoggedIn={Boolean(user)}
            userName={user?.name?.split(" ")[0]}
          />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-[#725A5A]">
              {user?.plan?.name ?? "Maigon Admin"}
            </p>
            <p className="text-sm font-medium text-[#271D1D]">
              {user?.name ?? user?.email ?? "—"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C]"
            onClick={() => loadAnalytics()}
            disabled={!canViewDashboard || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          {adminAnalyticsLink && (
            <Button
              variant="outline"
              size="sm"
              className="border-[#9A7C7C] text-[#9A7C7C]"
              asChild
            >
              <Link to={adminAnalyticsLink}>View analytics</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C]"
            onClick={() => setCustomSolutionModalOpen(true)}
            disabled={!canViewDashboard}
          >
            New solution
          </Button>
          <Button
            size="sm"
            className="bg-[#271D1D] hover:bg-[#271D1D]/80"
            onClick={() => setAddUserModalOpen(true)}
            disabled={!canViewDashboard}
          >
            Invite user
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 lg:px-16 py-10 space-y-8">
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Couldn’t load analytics</p>
              <p className="text-xs">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAnalytics()}
              className="border-red-300 text-red-700"
            >
              Retry
            </Button>
          </div>
        )}

        {showSignInPrompt && (
          <EmptyState message="Please sign in to access the admin dashboard." />
        )}

        {showUnauthorized && (
          <div className="space-y-4">
            <EmptyState message="This dashboard is only available to Maigon administrators." />
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/user-dashboard">Return to your dashboard</Link>
              </Button>
            </div>
          </div>
        )}

        {isInitialLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#9A7C7C] animate-spin" />
          </div>
        )}

        {!isInitialLoading && canViewDashboard && analytics && (
          <>
            <section className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9A7C7C]">
                    Platform Overview
                  </p>
                  <h1 className="text-3xl font-lora text-[#271D1D]">
                    Operational Performance
                  </h1>
                  <p className="text-sm text-[#725A5A]">
                    Monitor adoption, revenue, and workload across the entire Maigon platform.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-[#271D1D]/15 px-2 py-1 text-xs text-[#725A5A]">
                    <CheckCircle className="w-3 h-3 text-[#9A7C7C]" />
                    Updated {updatedAtLabel ?? "—"}
                  </div>
                  <div className="flex rounded-full border border-[#271D1D]/15 p-1 bg-white">
                    <Button
                      variant={timeRange === "7d" ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full px-3 ${
                        timeRange === "7d"
                          ? "bg-[#271D1D] text-white hover:bg-[#271D1D]/90"
                          : "border-0 text-[#271D1D]"
                      }`}
                      onClick={() => setTimeRange("7d")}
                    >
                      7 days
                    </Button>
                    <Button
                      variant={timeRange === "30d" ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full px-3 ${
                        timeRange === "30d"
                          ? "bg-[#271D1D] text-white hover:bg-[#271D1D]/90"
                          : "border-0 text-[#271D1D]"
                      }`}
                      onClick={() => setTimeRange("30d")}
                    >
                      30 days
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {overviewCards.map((card) => (
                  <MetricCard key={card.title} {...card} />
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
                    Launch Contract Reviews Instantly
                  </h2>
                  <p className="text-sm text-[#725A5A]">
                    Pick a solution and jump straight to the upload flow with the right perspective.
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
              <div className={`grid grid-cols-1 ${showAllQuickSolutions ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-3"} gap-4`}>
                {visibleQuickSolutions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleQuickAccess(item.key)}
                    className="text-left bg-[#F9F8F8] border border-[#271D1D]/10 rounded-xl p-4 hover:border-[#9A7C7C]/40 hover:shadow-sm transition"
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
                          {"description" in item ? item.description : "Launch a review tailored to this contract type."}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {user?.organization?.id ? (
              <section className="bg-white border border-[#E8DDDD] rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9A7C7C]">
                      Custom Solutions
                    </p>
                    <h2 className="text-xl font-lora text-[#271D1D]">
                      Organization-specific playbooks
                    </h2>
                    <p className="text-sm text-[#725A5A]">
                      Launch reviews using your organization’s tailored playbooks.
                    </p>
                  </div>
                  <div className="text-sm text-[#725A5A]">
                    {loadingOrgSolutions
                      ? "Loading..."
                      : orgCustomSolutions.length > 0
                        ? `${orgCustomSolutions.length} available`
                        : "None available"}
                  </div>
                </div>
                {orgCustomSolutions.length === 0 && !loadingOrgSolutions ? (
                  <EmptyState message="No custom solutions available for this organization yet." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {orgCustomSolutions.map((solution) => (
                      <div
                        key={solution.id ?? solution.name}
                        className="flex flex-col justify-between rounded-lg border border-[#271D1D]/10 bg-[#F9F8F8] p-4"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-[#271D1D] font-lora">
                            {solution.name}
                          </p>
                          <p className="text-xs text-[#725A5A]">
                            {solution.contractType || "Custom"} •{" "}
                            {solution.description?.slice(0, 120) ??
                              "Organization-specific playbook"}
                          </p>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button
                            size="sm"
                            className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                            onClick={() =>
                              navigate("/perspective-selection", {
                                state: {
                                  solutionTitle: solution.name,
                                  solutionId: solution.id,
                                  solutionKey: solution.contractType ?? "custom",
                                  customSolutionId: solution.id,
                                  quickUpload: true,
                                },
                              })
                            }
                          >
                            Launch
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <section>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <TimeSeriesList
                  title="New Users"
                  icon={<Users className="w-5 h-5" />}
                  points={selectedSeries?.users ?? []}
                  formatValue={formatNumber}
                />
                <TimeSeriesList
                  title="Contracts Created"
                  icon={<ClipboardList className="w-5 h-5" />}
                  points={selectedSeries?.contracts ?? []}
                  formatValue={formatNumber}
                />
                <TimeSeriesList
                  title="Revenue"
                  icon={<DollarSign className="w-5 h-5" />}
                  points={selectedSeries?.revenue ?? []}
                  formatValue={formatCurrency}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
              <PlanBreakdown plans={planItems} />
              <GeographyList geography={geography} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <TopUsersTable users={topUsers} />
              <SolutionsList solutions={solutions} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <PerformanceSummary performance={performance} topFeatures={topFeatures} />
              <ContractStatusList statuses={contractStatuses} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-4">
              <UsageList usage={usage} />
              <ErrorList errors={errors} />
            </section>
          </>
        )}

        {!isInitialLoading && canViewDashboard && !analytics && !error && (
          <EmptyState message="No analytics available yet. Run a few analyses to populate the dashboard." />
        )}
      </main>

      <Footer />

      <AddUserModal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onSuccess={handleUserAdded}
      />

      <CustomSolutionModal
        isOpen={customSolutionModalOpen}
        onClose={() => setCustomSolutionModalOpen(false)}
        onSuccess={handleSolutionCreated}
      />
    </div>
  );
}
