import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

type UserActivity = Database['public']['Tables']['user_activities']['Row'];
type UserActivityInsert = Database['public']['Tables']['user_activities']['Insert'];

export class UserActivitiesService {
  // Track a new activity
  static async trackActivity(activity: UserActivityInsert) {
    try {
      const { data, error } = await supabase
        .from("user_activities")
        .insert(activity)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Supabase user activity insert failed", e);
      throw e;
    }
  }

  // Get user activities with pagination
  static async getUserActivities(userId: string, page = 1, limit = 20) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from("user_activities")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Supabase user activities fetch failed", e);
      return [];
    }
  }

  // Get activities by type
  static async getActivitiesByType(userId: string, activityType: string) {
    const { data, error } = await supabase
      .from("user_activities")
      .select("*")
      .eq("user_id", userId)
      .eq("activity_type", activityType)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get recent activities for dashboard
  static async getRecentActivities(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from("user_activities")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Get activity statistics
  static async getActivityStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("user_activities")
      .select("activity_type, created_at")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString());

    if (error) throw error;

    const stats = {
      total: data.length,
      byType: {
        contract_upload: data.filter((a) => a.activity_type === "contract_upload")
          .length,
        review_completed: data.filter((a) => a.activity_type === "review_completed")
          .length,
        export_data: data.filter((a) => a.activity_type === "export_data").length,
        login: data.filter((a) => a.activity_type === "login").length,
        profile_update: data.filter((a) => a.activity_type === "profile_update")
          .length,
      },
      dailyActivity: this.groupByDay(data),
    };

    return stats;
  }

  private static groupByDay(activities: UserActivity[]) {
    const grouped: Record<string, number> = {};

    activities.forEach((activity) => {
      const date = new Date(activity.created_at).toISOString().split("T")[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return grouped;
  }

  // Track common activities with pre-defined methods
  static async trackLogin(userId: string) {
    return this.trackActivity({
      user_id: userId,
      activity_type: 'login',
      description: 'User logged in',
    });
  }

  static async trackContractUpload(
    userId: string,
    contractId: string,
    fileName: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.trackActivity({
      user_id: userId,
      activity_type: 'contract_upload',
      description: `Uploaded contract: ${fileName}`,
      metadata: { contract_id: contractId, file_name: fileName, ...(metadata || {}) },
    });
  }

  static async trackReviewCompleted(userId: string, contractId: string, reviewType: string) {
    return this.trackActivity({
      user_id: userId,
      activity_type: 'review_completed',
      description: `Completed ${reviewType} review`,
      metadata: { contract_id: contractId, review_type: reviewType },
    });
  }

  static async trackDataExport(userId: string, exportType: string) {
    return this.trackActivity({
      user_id: userId,
      activity_type: 'export_data',
      description: `Exported ${exportType} data`,
      metadata: { export_type: exportType },
    });
  }

  static async trackProfileUpdate(userId: string, updatedFields: string[]) {
    return this.trackActivity({
      user_id: userId,
      activity_type: 'profile_update',
      description: 'Updated profile information',
      metadata: { updated_fields: updatedFields },
    });
  }
}
