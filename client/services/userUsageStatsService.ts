import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type UserUsageStats = Database['public']['Tables']['user_usage_stats']['Row'];
type UserUsageStatsUpdate = Database['public']['Tables']['user_usage_stats']['Update'];

export class UserUsageStatsService {
  // Get user usage statistics
  static async getUserStats(userId: string) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    // If no stats exist, create initial record
    if (!data) {
      return this.initializeUserStats(userId);
    }

    return data;
  }

  // Initialize user stats record
  static async initializeUserStats(userId: string) {
    const { data, error } = await supabase
      .from('user_usage_stats')
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
    return data;
  }

  // Update contract reviewed count
  static async incrementContractsReviewed(userId: string) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .update({
        contracts_reviewed: supabase.sql`contracts_reviewed + 1`,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update pages reviewed count
  static async incrementPagesReviewed(userId: string, pages: number) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .update({
        total_pages_reviewed: supabase.sql`total_pages_reviewed + ${pages}`,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update risk assessments completed
  static async incrementRiskAssessments(userId: string) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .update({
        risk_assessments_completed: supabase.sql`risk_assessments_completed + 1`,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update compliance checks completed
  static async incrementComplianceChecks(userId: string) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .update({
        compliance_checks_completed: supabase.sql`compliance_checks_completed + 1`,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update last activity
  static async updateLastActivity(userId: string) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .update({
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get usage stats for multiple users (admin function)
  static async getAllUsersStats(limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .select(`
        *,
        user_profiles(email, first_name, last_name, company)
      `)
      .order('contracts_reviewed', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  // Get top users by activity
  static async getTopUsers(metric: string = 'contracts_reviewed', limit = 10) {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .select(`
        *,
        user_profiles(email, first_name, last_name, company)
      `)
      .order(metric, { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Get usage statistics summary
  static async getUsageSummary() {
    const { data, error } = await supabase
      .from('user_usage_stats')
      .select('contracts_reviewed, total_pages_reviewed, risk_assessments_completed, compliance_checks_completed');

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

    const summary = {
      totalUsers: data.length,
      totalContractsReviewed: data.reduce((sum, stat) => sum + (stat.contracts_reviewed || 0), 0),
      totalPagesReviewed: data.reduce((sum, stat) => sum + (stat.total_pages_reviewed || 0), 0),
      totalRiskAssessments: data.reduce((sum, stat) => sum + (stat.risk_assessments_completed || 0), 0),
      totalComplianceChecks: data.reduce((sum, stat) => sum + (stat.compliance_checks_completed || 0), 0),
      averageContractsPerUser: 0,
      averagePagesPerUser: 0,
    };

    summary.averageContractsPerUser = summary.totalContractsReviewed / summary.totalUsers;
    summary.averagePagesPerUser = summary.totalPagesReviewed / summary.totalUsers;

    return summary;
  }

  // Track completion of a review (unified method)
  static async trackReviewCompletion(userId: string, reviewType: string, pages: number = 1) {
    const updates: UserUsageStatsUpdate = {
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add specific increments based on review type
    if (reviewType === 'risk_assessment') {
      updates.risk_assessments_completed = supabase.sql`risk_assessments_completed + 1`;
    } else if (reviewType === 'compliance_score') {
      updates.compliance_checks_completed = supabase.sql`compliance_checks_completed + 1`;
    }

    // Always increment general stats
    updates.contracts_reviewed = supabase.sql`contracts_reviewed + 1`;
    updates.total_pages_reviewed = supabase.sql`total_pages_reviewed + ${pages}`;

    const { data, error } = await supabase
      .from('user_usage_stats')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
