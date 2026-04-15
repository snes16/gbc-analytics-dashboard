import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv, requireEnv } from "@/lib/server/env";

export function createSupabaseAdminClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}