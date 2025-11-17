import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let cachedConfig: { url: string; serviceKey: string } | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured for the ingestion service");
  }

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured for the ingestion service",
    );
  }

  if (
    cachedClient &&
    cachedConfig?.url === supabaseUrl &&
    cachedConfig?.serviceKey === serviceKey
  ) {
    return cachedClient;
  }

  cachedClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "maigon-ingestion/1.0.0",
      },
    },
  });

  cachedConfig = { url: supabaseUrl, serviceKey };

  return cachedClient;
}
