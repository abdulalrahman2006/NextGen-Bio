"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** An editor sends a post back to its author with a note. The post becomes a draft again. */
export async function requestChanges(id: string, note: string) {
  const text = note.trim().slice(0, 1000);
  if (text.length < 3) return { error: "Write a short note so the author knows what to fix." };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { data: post } = await supabase.from("posts").select("author_id, title").eq("id", id).maybeSingle();
  if (!post) return { error: "That post could not be found." };
  const { error, count } = await supabase.from("posts").update(
    { status: "draft", review_note: text, reviewed_at: new Date().toISOString(), reviewed_by: user.id }, { count: "exact" },
  ).eq("id", id); // RLS: staff only
  if (error) return { error: error.message };
  if (!count) return { error: "Only editors and admins can request changes." };
  if (post.author_id !== user.id) {
    await supabase.from("notifications").insert({ user_id: post.author_id, kind: "changes_requested", post_id: id, message: `Changes requested on “${post.title}”`.slice(0, 300) });
  }
  revalidatePath("/admin"); revalidatePath("/my-posts"); revalidatePath("/articles"); revalidatePath("/podcast");
  return { ok: true };
}

export async function dismissNotifications() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/my-posts");
}
