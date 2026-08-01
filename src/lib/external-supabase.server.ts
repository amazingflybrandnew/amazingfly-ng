import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client for the existing Amazingfly Travels Supabase project.
// Uses the publishable (anon) key, so RLS policies still apply.
function isOpaqueKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createExternalSupabase(): SupabaseClient {
  const url = process.env["EXTERNAL_SUPABASE_URL"];
  const key = process.env["EXTERNAL_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_PUBLISHABLE_KEY.");
  }

  return createClient(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // Opaque Supabase API keys are not bearer JWTs.
        if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
