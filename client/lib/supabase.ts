import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Use sessionStorage instead of localStorage for sessions
// This ensures sessions expire when browser tab is closed
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.sessionStorage, // Changed from localStorage to sessionStorage
    storageKey: 'sb-auth-token'
  }
})

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          first_name: string
          last_name: string
          company: string
          phone: string | null
          company_size: string | null
          country_region: string | null
          industry: string | null
          hear_about_us: string | null
          role: 'user' | 'admin'
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          email: string
          first_name: string
          last_name: string
          company: string
          phone?: string | null
          company_size?: string | null
          country_region?: string | null
          industry?: string | null
          hear_about_us?: string | null
          role?: 'user' | 'admin'
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          first_name?: string
          last_name?: string
          company?: string
          phone?: string | null
          company_size?: string | null
          country_region?: string | null
          industry?: string | null
          hear_about_us?: string | null
          role?: 'user' | 'admin'
          is_active?: boolean
        }
      }
    }
  }
}
