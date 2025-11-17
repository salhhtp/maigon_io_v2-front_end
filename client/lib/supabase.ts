import { createClient } from "@supabase/supabase-js";

import nativeFetch from "./nativeFetch";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    storageKey: "sb-auth-token",
  },
  global: {
    fetch: nativeFetch,
  },
});

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          created_at: string | null;
          updated_at: string | null;
          auth_user_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          company: string;
          phone: string | null;
          company_size: string | null;
          country_region: string | null;
          industry: string | null;
          hear_about_us: string | null;
          role: "user" | "admin" | null;
          organization_id: string | null;
          organization_role: "member" | "org_admin" | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          auth_user_id?: string | null;
          email: string;
          first_name: string;
          last_name: string;
          company: string;
          phone?: string | null;
          company_size?: string | null;
          country_region?: string | null;
          industry?: string | null;
          hear_about_us?: string | null;
          role?: "user" | "admin" | null;
          organization_id?: string | null;
          organization_role?: "member" | "org_admin" | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          auth_user_id?: string | null;
          email?: string;
          first_name?: string;
          last_name?: string;
          company?: string;
          phone?: string | null;
          company_size?: string | null;
          country_region?: string | null;
          industry?: string | null;
          hear_about_us?: string | null;
          role?: "user" | "admin" | null;
          organization_id?: string | null;
          organization_role?: "member" | "org_admin" | null;
          is_active?: boolean | null;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          billing_plan: string;
          seats_limit: number;
          documents_limit: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          billing_plan?: string;
          seats_limit?: number;
          documents_limit?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          billing_plan?: string;
          seats_limit?: number;
          documents_limit?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_alert_preferences: {
        Row: {
          organization_id: string;
          notify_high_risk: boolean;
          notify_pending_edits: boolean;
          alert_channel: string;
          metadata: Json;
          last_digest_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          notify_high_risk?: boolean;
          notify_pending_edits?: boolean;
          alert_channel?: string;
          metadata?: Json;
          last_digest_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          notify_high_risk?: boolean;
          notify_pending_edits?: boolean;
          alert_channel?: string;
          metadata?: Json;
          last_digest_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_activities: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          description: string | null;
          metadata: Json | null;
          created_at: string | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          organization_id?: string | null;
        };
      };
      user_usage_stats: {
        Row: {
          id: string;
          user_id: string;
          contracts_reviewed: number | null;
          total_pages_reviewed: number | null;
          risk_assessments_completed: number | null;
          compliance_checks_completed: number | null;
          last_activity: string | null;
          created_at: string | null;
          updated_at: string | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          contracts_reviewed?: number | null;
          total_pages_reviewed?: number | null;
          risk_assessments_completed?: number | null;
          compliance_checks_completed?: number | null;
          last_activity?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          contracts_reviewed?: number | null;
          total_pages_reviewed?: number | null;
          risk_assessments_completed?: number | null;
          compliance_checks_completed?: number | null;
          last_activity?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          organization_id?: string | null;
        };
      };
      contracts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          content_html: string | null;
          file_name: string | null;
          file_size: number | null;
          upload_date: string | null;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
          custom_solution_id: string | null;
          metadata: Json | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          content_html?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          upload_date?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          custom_solution_id?: string | null;
          metadata?: Json | null;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          content_html?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          upload_date?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          custom_solution_id?: string | null;
          metadata?: Json | null;
          organization_id?: string | null;
        };
      };
      contract_reviews: {
        Row: {
          id: string;
          contract_id: string;
          user_id: string;
          review_type: string;
          results: Json;
          score: number | null;
          confidence_level: number | null;
          created_at: string | null;
          updated_at: string | null;
          custom_solution_id: string | null;
          model_used: string | null;
          confidence_breakdown: Json | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          contract_id: string;
          user_id: string;
          review_type: string;
          results?: Json;
          score?: number | null;
          confidence_level?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          custom_solution_id?: string | null;
          model_used?: string | null;
          confidence_breakdown?: Json | null;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          contract_id?: string;
          user_id?: string;
          review_type?: string;
          results?: Json;
          score?: number | null;
          confidence_level?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          custom_solution_id?: string | null;
          model_used?: string | null;
          confidence_breakdown?: Json | null;
          organization_id?: string | null;
        };
      };
      analysis_metrics: {
        Row: {
          id: string;
          user_id: string;
          contract_id: string | null;
          review_id: string | null;
          ingestion_id: string | null;
          model_used: string | null;
          review_type: string | null;
          contract_type: string | null;
          solution_key: string | null;
          fallback_used: boolean | null;
          retry_count: number | null;
          latency_ms: number | null;
          started_at: string | null;
          completed_at: string | null;
          status: string | null;
          error_code: string | null;
          error_message: string | null;
          metadata: Json | null;
          created_at: string | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          contract_id?: string | null;
          review_id?: string | null;
          ingestion_id?: string | null;
          model_used?: string | null;
          review_type?: string | null;
          contract_type?: string | null;
          solution_key?: string | null;
          fallback_used?: boolean | null;
          retry_count?: number | null;
          latency_ms?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          status?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          contract_id?: string | null;
          review_id?: string | null;
          ingestion_id?: string | null;
          model_used?: string | null;
          review_type?: string | null;
          contract_type?: string | null;
          solution_key?: string | null;
          fallback_used?: boolean | null;
          retry_count?: number | null;
          latency_ms?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          status?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          organization_id?: string | null;
        };
      };
      agent_interaction_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string;
          contract_id: string | null;
          review_id: string | null;
          provider: string | null;
          model: string | null;
          edit_count: number | null;
          fallback_used: boolean | null;
          latency_ms: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id: string;
          contract_id?: string | null;
          review_id?: string | null;
          provider?: string | null;
          model?: string | null;
          edit_count?: number | null;
          fallback_used?: boolean | null;
          latency_ms?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          user_id?: string;
          contract_id?: string | null;
          review_id?: string | null;
          provider?: string | null;
          model?: string | null;
          edit_count?: number | null;
          fallback_used?: boolean | null;
          latency_ms?: number | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      agent_edit_approvals: {
        Row: {
          id: string;
          organization_id: string | null;
          interaction_id: string | null;
          user_id: string;
          contract_id: string | null;
          review_id: string | null;
          proposed_edit_id: string | null;
          clause_reference: string | null;
          change_type: string | null;
          suggested_text: string | null;
          rationale: string | null;
          metadata: Json;
          accepted_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          interaction_id?: string | null;
          user_id: string;
          contract_id?: string | null;
          review_id?: string | null;
          proposed_edit_id?: string | null;
          clause_reference?: string | null;
          change_type?: string | null;
          suggested_text?: string | null;
          rationale?: string | null;
          metadata?: Json;
          accepted_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          interaction_id?: string | null;
          user_id?: string;
          contract_id?: string | null;
          review_id?: string | null;
          proposed_edit_id?: string | null;
          clause_reference?: string | null;
          change_type?: string | null;
          suggested_text?: string | null;
          rationale?: string | null;
          metadata?: Json;
          accepted_at?: string;
        };
      };
      custom_solutions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          contract_type: string;
          compliance_framework: string[] | null;
          risk_level: string | null;
          custom_rules: string | null;
          analysis_depth: string | null;
          report_format: string | null;
          ai_model: string | null;
          prompts: Json | null;
          is_public: boolean | null;
          is_active: boolean | null;
          organization_id: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
          section_layout: Json | null;
          clause_library: Json | null;
          deviation_rules: Json | null;
          similarity_benchmarks: Json | null;
          model_settings: Json | null;
          drafting_settings: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          contract_type: string;
          compliance_framework?: string[] | null;
          risk_level?: string | null;
          custom_rules?: string | null;
          analysis_depth?: string | null;
          report_format?: string | null;
          ai_model?: string | null;
          prompts?: Json | null;
          is_public?: boolean | null;
          is_active?: boolean | null;
          organization_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          section_layout?: Json | null;
          clause_library?: Json | null;
          deviation_rules?: Json | null;
          similarity_benchmarks?: Json | null;
          model_settings?: Json | null;
          drafting_settings?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          contract_type?: string;
          compliance_framework?: string[] | null;
          risk_level?: string | null;
          custom_rules?: string | null;
          analysis_depth?: string | null;
          report_format?: string | null;
          ai_model?: string | null;
          prompts?: Json | null;
          is_public?: boolean | null;
          is_active?: boolean | null;
          organization_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          section_layout?: Json | null;
          clause_library?: Json | null;
          deviation_rules?: Json | null;
          similarity_benchmarks?: Json | null;
          model_settings?: Json | null;
          drafting_settings?: Json | null;
        };
      };
      admin_analytics: {
        Row: {
          id: string;
          metric_name: string;
          metric_value: number;
          metric_date: string;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          metric_name: string;
          metric_value: number;
          metric_date?: string;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          metric_name?: string;
          metric_value?: number;
          metric_date?: string;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
