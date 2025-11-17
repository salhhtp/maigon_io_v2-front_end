import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

type UserUsageStats = Database["public"]["Tables"]["user_usage_stats"]["Row"];
type UserUsageStatsUpdate =
  Database["public"]["Tables"]["user_usage_stats"]["Update"];

export class UserUsageStatsService {
  static async getUserStats(userId: string) {
    const { data, error } = await supabase
      .from("user_usage_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return this.initializeUserStats(userId);
    }

    return data as UserUsageStats;
  }

  static async initializeUserStats(userId: string) {
    const { data, error } = await supabase
      .from("user_usage_stats")
      .insert({
        user_id: userId,
        contracts_reviewed: 0,
        total_pages_reviewed: 0,
        risk_assessments_completed: 0,
        compliance_checks_completed: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserUsageStats;
  }

  static async incrementContractsReviewed(userId: string) {
    const current = await this.getUserStats(userId);
    return this.applyUpdate(userId, {
      contracts_reviewed: (current.contracts_reviewed ?? 0) + 1,
    });
  }

  static async incrementPagesReviewed(userId: string, pages: number) {
    const current = await this.getUserStats(userId);
    return this.applyUpdate(userId, {
      total_pages_reviewed: (current.total_pages_reviewed ?? 0) + pages,
    });
  }

  static async incrementRiskAssessments(userId: string) {
    const current = await this.getUserStats(userId);
    return this.applyUpdate(userId, {
      risk_assessments_completed: (current.risk_assessments_completed ?? 0) + 1,
    });
  }

  static async incrementComplianceChecks(userId: string) {
    const current = await this.getUserStats(userId);
    return this.applyUpdate(userId, {
      compliance_checks_completed:
        (current.compliance_checks_completed ?? 0) + 1,
    });
  }

  static async updateLastActivity(userId: string) {
    return this.applyUpdate(userId, {});
  }

  static async getAllUsersStats(limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from("user_usage_stats")
      .select(
        `
        *,
        user_profiles (email, first_name, last_name, company)
      `,
      )
      .order("contracts_reviewed", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Array<
      UserUsageStats & { user_profiles: Record<string, unknown> | null }
    >;
  }

  static async getTopUsers(metric = "contracts_reviewed", limit = 10) {
    const { data, error } = await supabase
      .from("user_usage_stats")
      .select(
        `
        *,
        user_profiles (email, first_name, last_name, company)
      `,
      )
      .order(metric, { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Array<
      UserUsageStats & { user_profiles: Record<string, unknown> | null }
    >;
  }

  static async getUsageSummary() {
    const { data, error } = await supabase
      .from("user_usage_stats")
      .select(
        "contracts_reviewed, total_pages_reviewed, risk_assessments_completed, compliance_checks_completed",
      );

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalUsers: 0,
        totalContractsReviewed: 0,
        totalPagesReviewed: 0,
        totalRiskAssessments: 0,
        totalComplianceChecks: 0,
        averageContractsPerUser: 0,
        averagePagesPerUser: 0,
      };
    }

    const totals = data.reduce(
      (acc, stat) => {
        acc.totalContractsReviewed += stat.contracts_reviewed ?? 0;
        acc.totalPagesReviewed += stat.total_pages_reviewed ?? 0;
        acc.totalRiskAssessments += stat.risk_assessments_completed ?? 0;
        acc.totalComplianceChecks += stat.compliance_checks_completed ?? 0;
        return acc;
      },
      {
        totalContractsReviewed: 0,
        totalPagesReviewed: 0,
        totalRiskAssessments: 0,
        totalComplianceChecks: 0,
      },
    );

    const totalUsers = data.length;

    return {
      totalUsers,
      totalContractsReviewed: totals.totalContractsReviewed,
      totalPagesReviewed: totals.totalPagesReviewed,
      totalRiskAssessments: totals.totalRiskAssessments,
      totalComplianceChecks: totals.totalComplianceChecks,
      averageContractsPerUser:
        totals.totalContractsReviewed / Math.max(totalUsers, 1),
      averagePagesPerUser:
        totals.totalPagesReviewed / Math.max(totalUsers, 1),
    };
  }

  static async trackReviewCompletion(
    userId: string,
    reviewType: string,
    pages = 1,
  ) {
    const current = await this.getUserStats(userId);
    const updates: UserUsageStatsUpdate = {
      contracts_reviewed: (current.contracts_reviewed ?? 0) + 1,
      total_pages_reviewed: (current.total_pages_reviewed ?? 0) + pages,
    };

    if (reviewType === "risk_assessment") {
      updates.risk_assessments_completed =
        (current.risk_assessments_completed ?? 0) + 1;
    }

    if (reviewType === "compliance_score") {
      updates.compliance_checks_completed =
        (current.compliance_checks_completed ?? 0) + 1;
    }

    return this.applyUpdate(userId, updates);
  }

  private static async applyUpdate(
    userId: string,
    update: UserUsageStatsUpdate,
  ) {
    const updatesWithTimestamps: UserUsageStatsUpdate = {
      ...update,
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_usage_stats")
      .update(updatesWithTimestamps)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserUsageStats;
  }
}
