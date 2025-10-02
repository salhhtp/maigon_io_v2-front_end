import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { isMockEnabled } from '@/lib/mockDb';

type UserUsageStats = Database['public']['Tables']['user_usage_stats']['Row'];
type UserUsageStatsUpdate = Database['public']['Tables']['user_usage_stats']['Update'];

export class UserUsageStatsService {
  // Get user usage statistics
  static async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_usage_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return this.initializeUserStats(userId);
      }
      return data as any;
    } catch (e) {
      // Fallback: keep a minimal in-memory/localStorage stats for preview
      const key = `mock_user_usage_stats_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      const init = {
        user_id: userId,
        contracts_reviewed: 0,
        total_pages_reviewed: 0,
        risk_assessments_completed: 0,
        compliance_checks_completed: 0,
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any;
      localStorage.setItem(key, JSON.stringify(init));
      return init;
    }
  }

  // Initialize user stats record
  static async initializeUserStats(userId: string) {
    try {
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
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const data = {
        user_id: userId,
        contracts_reviewed: 0,
        total_pages_reviewed: 0,
        risk_assessments_completed: 0,
        compliance_checks_completed: 0,
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any;
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    }
  }

  // Update contract reviewed count
  static async incrementContractsReviewed(userId: string) {
    try {
      const current: any = await this.getUserStats(userId);
      const { data, error } = await supabase
        .from('user_usage_stats')
        .update({
          contracts_reviewed: (current?.contracts_reviewed || 0) + 1,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = {
        ...current,
        user_id: userId,
        contracts_reviewed: (current.contracts_reviewed || 0) + 1,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated as any;
    }
  }

  // Update pages reviewed count
  static async incrementPagesReviewed(userId: string, pages: number) {
    try {
      const current: any = await this.getUserStats(userId);
      const { data, error } = await supabase
        .from('user_usage_stats')
        .update({
          total_pages_reviewed: (current?.total_pages_reviewed || 0) + pages,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = {
        ...current,
        user_id: userId,
        total_pages_reviewed: (current.total_pages_reviewed || 0) + pages,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated as any;
    }
  }

  // Update risk assessments completed
  static async incrementRiskAssessments(userId: string) {
    try {
      const current: any = await this.getUserStats(userId);
      const { data, error } = await supabase
        .from('user_usage_stats')
        .update({
          risk_assessments_completed: (current?.risk_assessments_completed || 0) + 1,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = {
        ...current,
        user_id: userId,
        risk_assessments_completed: (current.risk_assessments_completed || 0) + 1,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated as any;
    }
  }

  // Update compliance checks completed
  static async incrementComplianceChecks(userId: string) {
    try {
      const current: any = await this.getUserStats(userId);
      const { data, error } = await supabase
        .from('user_usage_stats')
        .update({
          compliance_checks_completed: (current?.compliance_checks_completed || 0) + 1,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = {
        ...current,
        user_id: userId,
        compliance_checks_completed: (current.compliance_checks_completed || 0) + 1,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated as any;
    }
  }

  // Update last activity
  static async updateLastActivity(userId: string) {
    try {
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
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = { ...current, last_activity: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: userId };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated as any;
    }
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
    try {
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
    } catch (e) {
      // Minimal summary from mock stats in preview
      const keys = Object.keys(localStorage).filter(k => k.startsWith('mock_user_usage_stats_'));
      const list = keys.map(k => JSON.parse(localStorage.getItem(k) || '{}'));
      if (list.length === 0) {
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
        totalUsers: list.length,
        totalContractsReviewed: list.reduce((s, x) => s + (x.contracts_reviewed || 0), 0),
        totalPagesReviewed: list.reduce((s, x) => s + (x.total_pages_reviewed || 0), 0),
        totalRiskAssessments: list.reduce((s, x) => s + (x.risk_assessments_completed || 0), 0),
        totalComplianceChecks: list.reduce((s, x) => s + (x.compliance_checks_completed || 0), 0),
        averageContractsPerUser: 0,
        averagePagesPerUser: 0,
      };
      summary.averageContractsPerUser = summary.totalContractsReviewed / (summary.totalUsers || 1);
      summary.averagePagesPerUser = summary.totalPagesReviewed / (summary.totalUsers || 1);
      return summary;
    }
  }

  // Track completion of a review (unified method)
  static async trackReviewCompletion(userId: string, reviewType: string, pages: number = 1) {
    try {
      const current: any = await this.getUserStats(userId);
      const isRisk = reviewType === 'risk_assessment';
      const isCompliance = reviewType === 'compliance_score';
      const updates: any = {
        contracts_reviewed: (current?.contracts_reviewed || 0) + 1,
        total_pages_reviewed: (current?.total_pages_reviewed || 0) + (pages || 1),
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isRisk) updates.risk_assessments_completed = (current?.risk_assessments_completed || 0) + 1;
      if (isCompliance) updates.compliance_checks_completed = (current?.compliance_checks_completed || 0) + 1;

      const { data, error } = await supabase
        .from('user_usage_stats')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      const key = `mock_user_usage_stats_${userId}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      const isRisk = reviewType === 'risk_assessment';
      const isCompliance = reviewType === 'compliance_score';
      const updated = {
        user_id: userId,
        contracts_reviewed: (current.contracts_reviewed || 0) + 1,
        total_pages_reviewed: (current.total_pages_reviewed || 0) + (pages || 1),
        risk_assessments_completed: (current.risk_assessments_completed || 0) + (isRisk ? 1 : 0),
        compliance_checks_completed: (current.compliance_checks_completed || 0) + (isCompliance ? 1 : 0),
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: current.created_at || new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated as any;
    }
  }
}
