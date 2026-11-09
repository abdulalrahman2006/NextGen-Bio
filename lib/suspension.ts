import type { SupabaseClient } from "@supabase/supabase-js";

/** Returns an error message if this user is currently suspended, otherwise null. One extra query. */
export async function suspensionError(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("suspended_until").eq("id", userId).maybeSingle();
  if (data?.suspended_until && new Date(data.suspended_until) > new Date()) {
    return `Your account is suspended until ${new Date(data.suspended_until).toLocaleString()}.`;
  }
  return null;
}
