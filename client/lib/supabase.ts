import { createClient } from "@supabase/supabase-js";

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
          is_active?: boolean | null;
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
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
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
        };
      };
      contracts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          file_name: string | null;
          file_size: number | null;
          upload_date: string | null;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
          custom_solution_id: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          file_name?: string | null;
          file_size?: number | null;
          upload_date?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          custom_solution_id?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          file_name?: string | null;
          file_size?: number | null;
          upload_date?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          custom_solution_id?: string | null;
          metadata?: Json | null;
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
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
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
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
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
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
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
