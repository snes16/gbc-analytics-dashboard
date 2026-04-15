import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv, requireEnv } from "./common";

export function createSupabaseAdminClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!getEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    console.warn(
      "[warn] SUPABASE_SERVICE_ROLE_KEY is not set, using publishable key. Upsert may fail if RLS/policies restrict writes.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
