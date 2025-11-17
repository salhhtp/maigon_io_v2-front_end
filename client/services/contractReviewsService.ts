import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

type ContractReview = Database['public']['Tables']['contract_reviews']['Row'];
type ContractReviewInsert = Database['public']['Tables']['contract_reviews']['Insert'];

export class ContractReviewsService {
  // Get all reviews for a contract
  static async getContractReviews(contractId: string) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get a specific review
  static async getReview(reviewId: string) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error) throw error;
    return data;
  }

  // Create a new review
  static async createReview(review: ContractReviewInsert) {
    try {
      const { data, error } = await supabase
        .from("contract_reviews")
        .insert(review)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Supabase contract review insert failed", e);
      throw e;
    }
  }

  // Get reviews by type for a user
  static async getUserReviewsByType(userId: string, reviewType: string) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select(`
        *,
        contracts(title, created_at)
      `)
      .eq('user_id', userId)
      .eq('review_type', reviewType)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get all reviews for a user
  static async getUserReviews(userId: string) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select(`
        *,
        contracts(title, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get review statistics for a user
  static async getUserReviewStats(userId: string) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select('review_type, score')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      byType: {
        risk_assessment: data.filter(r => r.review_type === 'risk_assessment').length,
        compliance_score: data.filter(r => r.review_type === 'compliance_score').length,
        perspective_review: data.filter(r => r.review_type === 'perspective_review').length,
        full_summary: data.filter(r => r.review_type === 'full_summary').length,
        ai_integration: data.filter(r => r.review_type === 'ai_integration').length,
      },
      averageScore: data.length > 0 
        ? data.reduce((sum, r) => sum + (r.score || 0), 0) / data.length 
        : 0,
    };

    return stats;
  }

  // Get recent reviews for dashboard
  static async getRecentReviews(userId: string, limit = 5) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select(`
        id,
        review_type,
        score,
        created_at,
        contracts(title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Get high-risk reviews for a user
  static async getHighRiskReviews(userId: string) {
    const { data, error } = await supabase
      .from('contract_reviews')
      .select(`
        *,
        contracts(title, created_at)
      `)
      .eq('user_id', userId)
      .eq('review_type', 'risk_assessment')
      .lt('score', 60) // Consider scores below 60 as high risk
      .order('score', { ascending: true });

    if (error) throw error;
    return data;
  }
}
