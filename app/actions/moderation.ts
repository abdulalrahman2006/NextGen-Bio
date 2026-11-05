"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reportContent(_: unknown, fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to report something." };
  const target_type = String(fd.get("target_type"));
  const target_id = String(fd.get("target_id"));
  const reason = String(fd.get("reason"));
  const details = String(fd.get("details") || "").trim().slice(0, 1000);
  if (!["post", "comment", "profile"].includes(target_type) || !UUID.test(target_id)) return { error: "That cannot be reported." };
  if (!["spam", "offensive", "misinformation", "copyright", "other"].includes(reason)) return { error: "Choose a reason." };
  if (target_type === "profile" && target_id === user.id) return { error: "You cannot report yourself." };
  const table = target_type === "post" ? "posts" : target_type === "comment" ? "comments" : "profiles";
  const col = target_type === "post" ? "id, author_id" : target_type === "comment" ? "id, user_id" : "id";
  const { data: found } = await supabase.from(table).select(col).eq("id", target_id).maybeSingle();
  if (!found) return { error: "That item no longer exists." };
  if (target_type === "post" && (found as { author_id?: string }).author_id === user.id) return { error: "You cannot report your own post." };
  if (target_type === "comment" && (found as { user_id?: string }).user_id === user.id) return { error: "You cannot report your own comment." };
  const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_type, target_id, reason, details: details || null });
  if (error) {
    if (error.code === "23505") return { error: "You already reported this. An editor will review it." };
    if (/could not find the table|relation/i.test(error.message)) return { error: "Reports are not set up yet. Ask an admin to run the step 3 SQL." };
    return { error: error.message };
  }
  return { ok: true };
}

export async function setReportStatus(id: string, status: string) {
  if (!["open", "reviewed", "dismissed"].includes(status)) return { error: "Unknown status." };
  const { error, data } = await createClient().from("reports").update({ status }).eq("id", id).select("id"); // RLS: staff only
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only editors and admins can change this." };
  revalidatePath("/admin");
  return { ok: true };
}

/** Authors can delete their own comments; editors and admins can delete any (enforced by RLS). */
export async function deleteComment(id: string) {
  const { error, data } = await createClient().from("comments").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You cannot delete this comment." };
  revalidatePath("/admin"); revalidatePath("/articles");
  return { ok: true };
}

export async function unpublishPost(id: string) {
  const { error, data } = await createClient().from("posts").update({ status: "draft" }).eq("id", id).select("id"); // RLS: staff only
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only editors and admins can unpublish." };
  revalidatePath("/admin"); revalidatePath("/articles"); revalidatePath("/podcast");
  return { ok: true };
}
