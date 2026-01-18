import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import aiService from "./aiService";

type ContractReview = Database['public']['Tables']['contract_reviews']['Row'];
type ContractReviewInsert = Database['public']['Tables']['contract_reviews']['Insert'];

const ASYNC_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

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
    return this.maybeResumeAsyncReview(data);
  }

  private static async maybeResumeAsyncReview(review: ContractReview) {
    const results = review.results as Record<string, any> | null;
    const asyncStatus = results?.async_status;
    const asyncMeta = results?.async_meta as Record<string, any> | undefined;
    const responseId = asyncMeta?.responseId as string | undefined;

    if (asyncStatus !== "pending" || !responseId) {
      return review;
    }

    const lastCheckedRaw = results?.async_last_checked_at;
    const lastCheckedAt = lastCheckedRaw
      ? new Date(String(lastCheckedRaw)).getTime()
      : 0;
    if (
      Number.isFinite(lastCheckedAt) &&
      Date.now() - lastCheckedAt < ASYNC_RECHECK_INTERVAL_MS
    ) {
      return review;
    }

    try {
      const check = await aiService.checkAsyncAnalysis({
        responseId,
        reviewType: asyncMeta?.reviewType ?? review.review_type,
        ingestionId: asyncMeta?.ingestionId ?? null,
        model: asyncMeta?.model ?? null,
        contractType: asyncMeta?.contractType ?? null,
        classification: asyncMeta?.classification ?? null,
        selectedSolution: asyncMeta?.selectedSolution ?? null,
        perspective: asyncMeta?.perspective ?? null,
        perspectiveLabel: asyncMeta?.perspectiveLabel ?? null,
        fileName: asyncMeta?.fileName ?? null,
        fileType: asyncMeta?.fileType ?? null,
        documentFormat: asyncMeta?.documentFormat ?? null,
        ingestionWarnings: asyncMeta?.ingestionWarnings,
      });

      const nowIso = new Date().toISOString();
      if (check.status === "completed" && check.result) {
        const nextResults = {
          ...check.result,
          async_status: "completed",
          async_response_id: responseId,
          async_completed_at: nowIso,
          async_meta: asyncMeta,
        };
        const nextScore =
          typeof check.result.score === "number"
            ? Math.round(check.result.score)
            : review.score ?? null;
        const nextConfidence =
          typeof check.result.confidence === "number"
            ? check.result.confidence
            : review.confidence_level ?? null;
        const nextModel =
          typeof check.result.model_used === "string"
            ? check.result.model_used
            : review.model_used ?? null;

        const { data, error } = await supabase
          .from("contract_reviews")
          .update({
            results: nextResults,
            score: nextScore,
            confidence_level: nextConfidence,
            model_used: nextModel,
          })
          .eq("id", review.id)
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } else {
        const nextResults = {
          ...results,
          async_status: check.status,
          async_last_checked_at: nowIso,
        };
        await supabase
          .from("contract_reviews")
          .update({ results: nextResults })
          .eq("id", review.id);
      }
    } catch (error) {
      console.warn("Async review resume check failed", {
        reviewId: review.id,
        responseId,
        error,
      });
    }

    return review;
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
