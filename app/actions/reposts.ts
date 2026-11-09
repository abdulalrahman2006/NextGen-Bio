"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { suspensionError } from "@/lib/suspension";

export async function repost(postId: string, note: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const suspended = await suspensionError(supabase, user.id);
  if (suspended) return { error: suspended };
  const { data: post } = await supabase.from("posts").select("author_id, title, status").eq("id", postId).maybeSingle();
  if (!post || post.status !== "published") return { error: "That post is not available to repost." };
  const { error } = await supabase.from("reposts")
    .upsert({ user_id: user.id, post_id: postId, note: note.trim().slice(0, 280) || null, created_at: new Date().toISOString() }, { onConflict: "user_id,post_id" });
  if (error) return { error: error.message };
  if (post.author_id !== user.id) {
    await supabase.from("notifications").insert({ user_id: post.author_id, kind: "repost", post_id: postId, message: `Someone reposted “${post.title}”.`.slice(0, 300) });
  }
  revalidatePath(`/articles/${postId}`); revalidatePath(`/podcast`); revalidatePath(`/u/${user.id}`); revalidatePath(`/u/${post.author_id}`);
  return { ok: true };
}

export async function undoRepost(postId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { error } = await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath(`/articles/${postId}`); revalidatePath(`/podcast`); revalidatePath(`/u/${user.id}`);
  return { ok: true };
}
