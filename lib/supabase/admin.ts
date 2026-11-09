import { createClient as createPlainClient } from "@supabase/supabase-js";

/**
 * Uses the service_role key, which bypasses every RLS rule in the database. Never import this
 * from a Client Component, never send this key to the browser, and never add it with a
 * NEXT_PUBLIC_ prefix. Use this only for things the anon key genuinely cannot do (here: deleting
 * an auth user). For everything else, use lib/supabase/server.ts instead.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
