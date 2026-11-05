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
  const { error, data } = await supabase.from("posts").update(
    { status: "draft", review_note: text, reviewed_at: new Date().toISOString(), reviewed_by: user.id },
  ).eq("id", id).select("id"); // RLS: staff only
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only editors and admins can request changes." };
  if (post.author_id !== user.id) {
    await supabase.from("notifications").insert({ user_id: post.author_id, kind: "changes_requested", post_id: id, message: `Changes requested on “${post.title}”`.slice(0, 300) });
  }
  revalidatePath("/admin"); revalidatePath("/my-posts"); revalidatePath("/articles"); revalidatePath("/podcast");
  return { ok: true };
}

/** An editor notes a problem on a post that stays published and live. The author is told, but nothing is hidden. */
export async function flagPublished(id: string, note: string) {
  const text = note.trim().slice(0, 1000);
  if (text.length < 3) return { error: "Write a short note so the author knows what's wrong." };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { data: post } = await supabase.from("posts").select("author_id, title, status").eq("id", id).maybeSingle();
  if (!post) return { error: "That post could not be found." };
  if (post.status !== "published") return { error: "Only a published post can be flagged this way." };
  const { error, data } = await supabase.from("posts").update(
    { review_note: text, reviewed_at: new Date().toISOString(), reviewed_by: user.id },
  ).eq("id", id).eq("status", "published").select("id"); // RLS: staff only
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only editors and admins can flag a post." };
  if (post.author_id !== user.id) {
    await supabase.from("notifications").insert({ user_id: post.author_id, kind: "flagged", post_id: id, message: `An editor flagged an issue on “${post.title}”. It's still published.`.slice(0, 300) });
  }
  revalidatePath("/admin"); revalidatePath("/my-posts");
  return { ok: true };
}

/** Clears a flag note on a published post once the issue has been dealt with. */
export async function clearFlag(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { error, data } = await supabase.from("posts").update({ review_note: null }).eq("id", id).eq("status", "published").select("id"); // RLS: staff only
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only editors and admins can clear a flag." };
  revalidatePath("/admin"); revalidatePath("/my-posts");
  return { ok: true };
}

export async function dismissNotifications() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/my-posts");
}
