"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleSave(postId: string): Promise<{ error?: string; saved?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save posts." };
  const { data: existing } = await supabase.from("saves").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("saves").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/library");
    return { saved: false };
  }
  const { error } = await supabase.from("saves").insert({ post_id: postId, user_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/library");
  return { saved: true };
}
