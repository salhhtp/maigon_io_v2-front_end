import express from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import { getUserAccessContextByAuthId } from "../lib/userAccess";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  type AdminDashboardAnalytics,
  type AdminDashboardPlanBreakdownItem,
  type AdminDashboardTimeSeriesPoint,
  type AdminDashboardTopUser,
  type AdminDashboardSolutionSummary,
} from "../../shared/api";
import { getPlanByKey } from "../../shared/plans";

const adminDashboardRouter = express.Router();

const MAX_DAYS = 90;

async function authorizeAdmin(
  req: express.Request,
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

    res.locals.adminAuthUserId = authUserId;
    next();
  } catch (error) {
    console.error("[admin-dashboard] Authorization failure", error);
    res.status(500).json({ error: "Failed to authorize request" });
  }
}

adminDashboardRouter.use(authorizeAdmin);

function toDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function createDailySeries(
  days: number,
  end: Date,
  records: Array<{ created_at: string | null }>,
  valueExtractor: (record: Record<string, any>) => number = () => 1,
): AdminDashboardTimeSeriesPoint[] {
  const buckets = new Map<string, { value: number }>();
  const result: AdminDashboardTimeSeriesPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(end);
    current.setDate(current.getDate() - i);
    const key = toDateKey(current);
    buckets.set(key, { value: 0 });
    result.push({ date: key, value: 0 });
  }

  for (const record of records) {
    if (!record?.created_at) continue;
    const key = toDateKey(record.created_at);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.value += valueExtractor(record as Record<string, any>);
    }
  }

  return result.map((point) => ({
    date: point.date,
    value: buckets.get(point.date)?.value ?? 0,
  }));
}

function calculateGrowth(current: number, previous: number): number | null {
  if (!isFinite(current) || !isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function sumAmountCents(rows: Array<{ amount_cents?: number | null }>): number {
  return rows.reduce((total, row) => total + (row.amount_cents ?? 0), 0);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function handlePostgrestError(error?: PostgrestError | null) {
  if (!error) return;
  throw error;
}

function resolveOptionalData<T>(
  response: { data: T | null; error: PostgrestError | null },
  fallback: T,
  context: string,
): T {
  if (response.error) {
    if (response.error.code === "PGRST205") {
      console.warn(
        `[admin-dashboard] optional dataset unavailable (${context}): ${response.error.message}`,
      );
      return fallback;
    }
    throw response.error;
  }

  return response.data ?? fallback;
}

adminDashboardRouter.get("/", async (req, res) => {
  const supabase = getSupabaseAdminClient();

  const requestedDays = Number.parseInt(String(req.query.days ?? ""), 10);
  const days = Number.isFinite(requestedDays) && requestedDays > 0
    ? Math.min(requestedDays, MAX_DAYS)
    : 30;

  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));

  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - days);
  const previousEnd = new Date(startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const startIso = startDate.toISOString();
  const previousStartIso = previousStart.toISOString();
  const previousEndIso = previousEnd.toISOString();

  try {
    const [
      totalUsersResp,
      activeUsersResp,
      currentUsersResp,
      previousUsersResp,
      contractsCurrentResp,
      contractsPreviousResp,
      allContractsStatusResp,
      contractReviewsResp,
      billingCurrentResp,
      billingPreviousResp,
      billingAllResp,
      userPlansResp,
      geographyResp,
      topUsersResp,
      analysisMetricsResp,
      customSolutionsResp,
      solutionUsageContractsResp,
    ] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("user_profiles")
        .select("id, created_at")
        .gte("created_at", startIso),
      supabase
        .from("user_profiles")
        .select("id, created_at")
        .gte("created_at", previousStartIso)
        .lte("created_at", previousEndIso),
      supabase
        .from("contracts")
        .select("id, created_at, status, organization_id")
        .gte("created_at", startIso),
      supabase
        .from("contracts")
        .select("id, created_at")
        .gte("created_at", previousStartIso)
        .lte("created_at", previousEndIso),
      supabase
        .from("contracts")
        .select("status"),
      supabase
        .from("contract_reviews")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("billing_transactions")
        .select("amount_cents, plan_key, created_at")
        .gte("created_at", startIso),
      supabase
        .from("billing_transactions")
        .select("amount_cents, created_at")
        .gte("created_at", previousStartIso)
        .lte("created_at", previousEndIso),
      supabase
        .from("billing_transactions")
        .select("amount_cents"),
      supabase
        .from("user_plans")
        .select("user_id, plan_type, price, updated_at"),
      supabase
        .from("user_profiles")
        .select("country_region"),
      supabase
        .from("user_usage_stats")
        .select(
          "user_id, contracts_reviewed, total_pages_reviewed, last_activity, user_profiles:user_id(first_name,last_name,email,company)"
        )
        .order("contracts_reviewed", { ascending: false })
        .limit(10),
      supabase
        .from("analysis_metrics")
        .select(
          "status, fallback_used, latency_ms, solution_key, contract_type, error_code"
        )
        .gte("created_at", previousStartIso),
      supabase
        .from("custom_solutions")
        .select("id, name, contract_type, is_active, updated_at"),
      supabase
        .from("contracts")
        .select("custom_solution_id")
        .not("custom_solution_id", "is", null),
    ]);

    handlePostgrestError(totalUsersResp.error);
    handlePostgrestError(activeUsersResp.error);
    handlePostgrestError(currentUsersResp.error);
    handlePostgrestError(previousUsersResp.error);
    handlePostgrestError(contractsCurrentResp.error);
    handlePostgrestError(contractsPreviousResp.error);
    handlePostgrestError(allContractsStatusResp.error);
    handlePostgrestError(contractReviewsResp.error);
    handlePostgrestError(geographyResp.error);
    handlePostgrestError(topUsersResp.error);

    const totalUsers = totalUsersResp.count ?? 0;
    const activeUsers = activeUsersResp.count ?? 0;
    const currentUsers = currentUsersResp.data ?? [];
    const previousUsers = previousUsersResp.data ?? [];
    const currentContracts = contractsCurrentResp.data ?? [];
    const previousContracts = contractsPreviousResp.data ?? [];
    const contractStatuses = allContractsStatusResp.data ?? [];
    const totalContractReviews = contractReviewsResp.count ?? 0;
    const billingCurrent = resolveOptionalData<any[]>(
      billingCurrentResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "billing_transactions (current)",
    );
    const billingPrevious = resolveOptionalData<any[]>(
      billingPreviousResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "billing_transactions (previous)",
    );
    const billingAll = resolveOptionalData<any[]>(
      billingAllResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "billing_transactions (all)",
    );
    const planRows = resolveOptionalData<any[]>(
      userPlansResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "user_plans",
    );
    const geographyRows = geographyResp.data ?? [];
    const topUsersRows = topUsersResp.data ?? [];
    const analysisRows = resolveOptionalData<any[]>(
      analysisMetricsResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "analysis_metrics",
    );
    const customSolutions = resolveOptionalData<any[]>(
      customSolutionsResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "custom_solutions",
    );
    const solutionContracts = resolveOptionalData<any[]>(
      solutionUsageContractsResp as unknown as { data: any[] | null; error: PostgrestError | null },
      [] as any[],
      "contracts custom_solution_id",
    );

    const totalRevenueEur = round(sumAmountCents(billingAll) / 100, 2);
    const currentRevenueEur = sumAmountCents(billingCurrent) / 100;
    const previousRevenueEur = sumAmountCents(billingPrevious) / 100;

    const last7Users = createDailySeries(7, endDate, currentUsers);
    const last7Contracts = createDailySeries(7, endDate, currentContracts);
    const last7Revenue = createDailySeries(7, endDate, billingCurrent, (row) =>
      (row.amount_cents ?? 0) / 100,
    );
    const last7UsersPrev = createDailySeries(7, previousEnd, previousUsers);
    const last7ContractsPrev = createDailySeries(7, previousEnd, previousContracts);
    const last7RevenuePrev = createDailySeries(7, previousEnd, billingPrevious, (row) =>
      (row.amount_cents ?? 0) / 100,
    );

    const last30Users = createDailySeries(days, endDate, currentUsers);
    const last30Contracts = createDailySeries(days, endDate, currentContracts);
    const last30Revenue = createDailySeries(days, endDate, billingCurrent, (row) =>
      (row.amount_cents ?? 0) / 100,
    );

    const last30UsersPrev = createDailySeries(days, previousEnd, previousUsers);
    const last30ContractsPrev = createDailySeries(days, previousEnd, previousContracts);
    const last30RevenuePrev = createDailySeries(days, previousEnd, billingPrevious, (row) =>
      (row.amount_cents ?? 0) / 100,
    );

    const series7Users = last7Users.map((point, index) => ({
      ...point,
      previous: last7UsersPrev[index]?.value ?? 0,
    }));
    const series7Contracts = last7Contracts.map((point, index) => ({
      ...point,
      previous: last7ContractsPrev[index]?.value ?? 0,
    }));
    const series7Revenue = last7Revenue.map((point, index) => ({
      ...point,
      previous: last7RevenuePrev[index]?.value ?? 0,
    }));

    const series30Users = last30Users.map((point, index) => ({
      ...point,
      previous: last30UsersPrev[index]?.value ?? 0,
    }));
    const series30Contracts = last30Contracts.map((point, index) => ({
      ...point,
      previous: last30ContractsPrev[index]?.value ?? 0,
    }));
    const series30Revenue = last30Revenue.map((point, index) => ({
      ...point,
      previous: last30RevenuePrev[index]?.value ?? 0,
    }));

    const currentUserTotal = currentUsers.length;
    const previousUserTotal = previousUsers.length;
    const currentContractTotal = currentContracts.length;
    const previousContractTotal = previousContracts.length;

    const userGrowthPct = calculateGrowth(currentUserTotal, previousUserTotal);
    const revenueGrowthPct = calculateGrowth(currentRevenueEur, previousRevenueEur);
    const contractGrowthPct = calculateGrowth(currentContractTotal, previousContractTotal);

    const planDistribution = new Map<string, AdminDashboardPlanBreakdownItem>();
    for (const row of planRows) {
      const key = row.plan_type ?? "unknown";
      if (!planDistribution.has(key)) {
        const definition = getPlanByKey(key) ?? null;
        planDistribution.set(key, {
          planKey: key,
          planName: definition?.name ?? key,
          users: 0,
          revenueEur: 0,
        });
      }
      const item = planDistribution.get(key)!;
      item.users += 1;
      if (typeof row.price === "number") {
        item.revenueEur += row.price;
      }
    }

    const revenueByPlan = new Map<string, number>();
    for (const tx of billingAll) {
      const planKey = (tx as Record<string, unknown>).plan_key as string | undefined;
      if (!planKey) continue;
      revenueByPlan.set(
        planKey,
        (revenueByPlan.get(planKey) ?? 0) + ((tx.amount_cents ?? 0) / 100),
      );
    }
    for (const [key, value] of revenueByPlan) {
      if (!planDistribution.has(key)) {
        const definition = getPlanByKey(key) ?? null;
        planDistribution.set(key, {
          planKey: key,
          planName: definition?.name ?? key,
          users: 0,
          revenueEur: round(value, 2),
        });
      } else {
        const item = planDistribution.get(key)!;
        item.revenueEur = round(item.revenueEur + value, 2);
      }
    }

    const geography = geographyRows
      .map((row) => row.country_region?.trim() || "Unknown")
      .reduce<Record<string, number>>((acc, country) => {
        acc[country] = (acc[country] ?? 0) + 1;
        return acc;
      }, {});

    const geographyList = Object.entries(geography)
      .sort((a, b) => b[1] - a[1])
      .map(([country, users]) => ({ country, users }));

    const contractStatusCounts = contractStatuses
      .map((row) => row.status ?? "unknown")
      .reduce<Record<string, number>>((acc, status) => {
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {});

    const topUsers: AdminDashboardTopUser[] = topUsersRows.map((row) => {
      const profile = (row as any).user_profiles ?? null;
      const name = profile
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim().replace(/\s+/g, " ") ||
          profile.email ||
          row.user_id
        : row.user_id;
      return {
        userId: row.user_id,
        name,
        email: profile?.email ?? null,
        company: profile?.company ?? null,
        contractsReviewed: row.contracts_reviewed ?? 0,
        totalPagesReviewed: row.total_pages_reviewed ?? 0,
        lastActivity: row.last_activity ?? null,
      } satisfies AdminDashboardTopUser;
    });

    const analysisTotal = analysisRows.length;
    const analysisCompleted = analysisRows.filter((row) => row.status === "completed").length;
    const analysisFallback = analysisRows.filter((row) => row.fallback_used).length;
    const avgLatencyMs = analysisRows
      .filter((row) => typeof row.latency_ms === "number")
      .reduce((acc, row) => acc + (row.latency_ms ?? 0), 0);
    const avgLatencySeconds = analysisRows.filter((row) => typeof row.latency_ms === "number").length
      ? round(avgLatencyMs / analysisRows.filter((row) => typeof row.latency_ms === "number").length / 1000, 2)
      : null;

    const topFeatures = analysisRows
      .map((row) => row.solution_key || "unspecified")
      .reduce<Record<string, number>>((acc, key) => {
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    const contractTypes = analysisRows
      .map((row) => row.contract_type || "unspecified")
      .reduce<Record<string, number>>((acc, key) => {
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    const errorSummary = analysisRows
      .map((row) => row.error_code || "none")
      .reduce<Record<string, number>>((acc, key) => {
        if (key === "none") return acc;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    const solutionUsageMap = solutionContracts
      .map((row) => row.custom_solution_id || "")
      .filter((id): id is string => Boolean(id))
      .reduce<Record<string, number>>((acc, id) => {
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      }, {});

    const solutionSummaries: AdminDashboardSolutionSummary[] = customSolutions.map((solution) => ({
      id: solution.id,
      name: solution.name,
      contractType: solution.contract_type ?? null,
      isActive: solution.is_active ?? false,
      usageCount: solutionUsageMap[solution.id] ?? 0,
      lastUpdated: solution.updated_at ?? null,
    }));

    const monthlyUsageMap = new Map<string, { contracts: number; users: number; revenue: number }>();
    for (const contract of currentContracts) {
      if (!contract.created_at) continue;
      const monthKey = contract.created_at.slice(0, 7);
      if (!monthlyUsageMap.has(monthKey)) {
        monthlyUsageMap.set(monthKey, { contracts: 0, users: 0, revenue: 0 });
      }
      monthlyUsageMap.get(monthKey)!.contracts += 1;
    }
    for (const user of currentUsers) {
      if (!user.created_at) continue;
      const monthKey = user.created_at.slice(0, 7);
      if (!monthlyUsageMap.has(monthKey)) {
        monthlyUsageMap.set(monthKey, { contracts: 0, users: 0, revenue: 0 });
      }
      monthlyUsageMap.get(monthKey)!.users += 1;
    }
    for (const tx of billingCurrent) {
      if (!tx.created_at) continue;
      const monthKey = tx.created_at.slice(0, 7);
      if (!monthlyUsageMap.has(monthKey)) {
        monthlyUsageMap.set(monthKey, { contracts: 0, users: 0, revenue: 0 });
      }
      monthlyUsageMap.get(monthKey)!.revenue += (tx.amount_cents ?? 0) / 100;
    }

    const monthlyUsage = Array.from(monthlyUsageMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, value]) => ({
        month,
        contracts: value.contracts,
        users: value.users,
        revenue: round(value.revenue, 2),
      }));

    const analytics: AdminDashboardAnalytics = {
      overview: {
        totalUsers,
        activeUsers,
        contractsReviewed: totalContractReviews,
        totalRevenueEur: round(totalRevenueEur, 2),
        userGrowthPct: userGrowthPct !== null ? round(userGrowthPct, 2) : null,
        revenueGrowthPct:
          revenueGrowthPct !== null ? round(revenueGrowthPct, 2) : null,
        contractsGrowthPct:
          contractGrowthPct !== null ? round(contractGrowthPct, 2) : null,
      },
      timeSeries: {
        last7Days: {
          users: series7Users,
          contracts: series7Contracts,
          revenue: series7Revenue,
        },
        last30Days: {
          users: series30Users,
          contracts: series30Contracts,
          revenue: series30Revenue,
        },
      },
      plans: Array.from(planDistribution.values()).map((item) => ({
        ...item,
        revenueEur: round(item.revenueEur, 2),
      })),
      geography: geographyList,
      contractStatus: Object.entries(contractStatusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      topUsers,
      solutions: solutionSummaries,
      platformMetrics: {
        usage: monthlyUsage,
        contractTypes: Object.entries(contractTypes)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count })),
        performance: {
          avgProcessingTimeSeconds: avgLatencySeconds,
          successRatePct:
            analysisTotal > 0
              ? round((analysisCompleted / analysisTotal) * 100, 2)
              : null,
          errorRatePct:
            analysisTotal > 0
              ? round(((analysisTotal - analysisCompleted) / analysisTotal) * 100, 2)
              : null,
          apiUptimePct: null,
        },
        topFeatures: Object.entries(topFeatures)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([key, usage]) => ({ key, label: key, usage })),
      },
      userMetrics: {
        retention: [],
      },
      errors: Object.entries(errorSummary).map(([code, count]) => ({
        code,
        count,
      })),
      updatedAt: now.toISOString(),
    } satisfies AdminDashboardAnalytics;

    res.json(analytics);
  } catch (error) {
    console.error("[admin-dashboard] Failed to compute analytics", error);
    res.status(500).json({ error: "Failed to load admin analytics" });
  }
});

export { adminDashboardRouter };
