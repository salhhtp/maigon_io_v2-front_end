import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type AdminAnalytic = Database['public']['Tables']['admin_analytics']['Row'];

export class AdminAnalyticsService {
  // Get platform analytics by metric name
  static async getMetrics(metricName: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('admin_analytics')
      .select('*')
      .eq('metric_name', metricName)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Get latest metrics for dashboard
  static async getLatestMetrics() {
    const { data, error } = await supabase
      .from('admin_analytics')
      .select('*')
      .eq('metric_date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get user growth analytics
  static async getUserGrowthAnalytics(days = 30) {
    const { data, error } = await supabase
      .rpc('get_user_growth_stats', { days_back: days });

    if (error) throw error;
    return data;
  }

  // Get contract analytics
  static async getContractAnalytics() {
    const { data: totalContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true });

    const { data: contractsByStatus, error: statusError } = await supabase
      .from('contracts')
      .select('status')
      .order('status');

    const { data: recentContracts, error: recentError } = await supabase
      .from('contracts')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (contractsError || statusError || recentError) {
      throw contractsError || statusError || recentError;
    }

    // Group contracts by status
    const statusCounts = contractsByStatus?.reduce((acc: any, contract) => {
      acc[contract.status] = (acc[contract.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total: totalContracts?.length || 0,
      byStatus: statusCounts,
      recentCount: recentContracts?.length || 0,
      recentContracts: recentContracts?.slice(0, 10) || [],
    };
  }

  // Get review analytics
  static async getReviewAnalytics() {
    const { data: totalReviews, error: reviewsError } = await supabase
      .from('contract_reviews')
      .select('*', { count: 'exact', head: true });

    const { data: reviewsByType, error: typeError } = await supabase
      .from('contract_reviews')
      .select('review_type, score')
      .order('review_type');

    if (reviewsError || typeError) {
      throw reviewsError || typeError;
    }

    // Group reviews by type and calculate averages
    const typeStats = reviewsByType?.reduce((acc: any, review) => {
      if (!acc[review.review_type]) {
        acc[review.review_type] = { count: 0, totalScore: 0, avgScore: 0 };
      }
      acc[review.review_type].count += 1;
      acc[review.review_type].totalScore += review.score || 0;
      acc[review.review_type].avgScore = acc[review.review_type].totalScore / acc[review.review_type].count;
      return acc;
    }, {}) || {};

    return {
      total: totalReviews?.length || 0,
      byType: typeStats,
    };
  }

  // Get user activity analytics
  static async getUserActivityAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: activities, error } = await supabase
      .from('user_activities')
      .select('activity_type, created_at, user_id')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Calculate daily active users
    const dailyActiveUsers = activities?.reduce((acc: any, activity) => {
      const date = activity.created_at.split('T')[0];
      if (!acc[date]) acc[date] = new Set();
      acc[date].add(activity.user_id);
      return acc;
    }, {}) || {};

    // Convert sets to counts
    const dailyActiveUserCounts = Object.keys(dailyActiveUsers).reduce((acc: any, date) => {
      acc[date] = dailyActiveUsers[date].size;
      return acc;
    }, {});

    // Group by activity type
    const activityTypeCounts = activities?.reduce((acc: any, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      totalActivities: activities?.length || 0,
      dailyActiveUsers: dailyActiveUserCounts,
      byActivityType: activityTypeCounts,
      uniqueActiveUsers: new Set(activities?.map(a => a.user_id) || []).size,
    };
  }

  // Get platform overview
  static async getPlatformOverview() {
    const [userStats, contractStats, reviewStats, activityStats] = await Promise.all([
      this.getUserStats(),
      this.getContractAnalytics(),
      this.getReviewAnalytics(),
      this.getUserActivityAnalytics(7), // Last 7 days
    ]);

    return {
      users: userStats,
      contracts: contractStats,
      reviews: reviewStats,
      activities: activityStats,
    };
  }

  // Get user statistics
  static async getUserStats() {
    const { data: totalUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    const { data: recentUsers, error: recentError } = await supabase
      .from('user_profiles')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: activeUsers, error: activeError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true);

    if (usersError || recentError || activeError) {
      throw usersError || recentError || activeError;
    }

    return {
      total: totalUsers?.length || 0,
      active: activeUsers?.length || 0,
      newThisWeek: recentUsers?.length || 0,
    };
  }

  // Update analytics (should be called periodically)
  static async updateAnalytics() {
    const { error } = await supabase.rpc('update_admin_analytics');
    if (error) throw error;
  }
}
