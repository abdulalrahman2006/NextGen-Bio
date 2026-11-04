"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { youtubeId } from "@/lib/youtube";

function normTags(raw: string) {
  const seen = new Set<string>(); const out: string[] = [];
  for (const t of raw.split(",")) {
    const v = t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
    if (v && !seen.has(v)) { seen.add(v); out.push(v); }
    if (out.length === 5) break;
  }
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads the writing form. With draft = true nothing is required, so half-finished work can be saved. */
function parseForm(fd: FormData, draft = false) {
  let title = String(fd.get("title") || "").trim().slice(0, 200);
  const content = String(fd.get("content") || "").trim();
  if (draft && !title) title = "Untitled draft";
  if (!draft && (!title || !content)) return { error: "Title and content are required." } as const;
  if (content.length > 60000) return { error: "That is too long. Please keep it under 60,000 characters." } as const;
  const post_type = String(fd.get("post_type"));
  if (!["article", "idea", "dataset", "protocol", "audio"].includes(post_type)) return { error: "Choose a post type." } as const;
  const tags = normTags(String(fd.get("tags") || ""));
  let metadata: Record<string, unknown> = {};
  if (post_type === "audio") {
    let duration = String(fd.get("duration") || "").trim();
    const mt = String(fd.get("media_type"));
    if (mt === "youtube" && !duration) duration = "00:00";
    const okDuration = /^\d{1,3}:\d{2}$/.test(duration);
    if (!okDuration) { if (!draft) return { error: "Enter the episode length as minutes:seconds, for example 38:10." } as const; duration = ""; }
    let media_url = String(fd.get("media_url") || "").trim();
    if (media_url && !/^https?:\/\//.test(media_url)) { if (!draft) return { error: "The media link must start with http:// or https://" } as const; media_url = ""; }
    const media_type = mt === "video" || mt === "youtube" ? mt : "audio";
    if (!draft && media_type === "youtube" && !youtubeId(media_url)) return { error: "That does not look like a YouTube link." } as const;
    let cover_url = String(fd.get("cover_url") || "").trim();
    if (cover_url && !/^https?:\/\//.test(cover_url)) { if (!draft) return { error: "The cover image link must start with http:// or https://" } as const; cover_url = ""; }
    metadata = {
      guest: String(fd.get("guest") || "").trim(),
      duration, media_url, media_type, cover_url,
      notes: String(fd.get("notes") || "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8),
      transcript: String(fd.get("transcript") || "").trim().slice(0, 60000),
    };
  }
  return { data: { title, content, post_type, tags, category: tags[0] ?? "General", metadata } } as const;
}

/** Save a draft or send the post for review. Creates the post, or updates the one in post_id. */
export async function savePost(_: unknown, fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const intent = String(fd.get("intent")) === "draft" ? "draft" : "submit";
  const parsed = parseForm(fd, intent === "draft");
  if ("error" in parsed) return { error: parsed.error };
  const { data: me } = await supabase.from("profiles").select("role, trusted").eq("id", user.id).maybeSingle();
  const isStaff = !!me && ["admin", "editor"].includes(me.role);
  const autoPublish = isStaff || !!me?.trusted;
  if (parsed.data.post_type === "audio" && !isStaff) return { error: "Only editors and admins can publish podcast episodes." };
  const id = String(fd.get("post_id") || "");
  const wanted = intent === "draft" ? "draft" : autoPublish ? "published" : "pending";
  const view = (post_type: string, pid: string) => (post_type === "audio" ? `/podcast?ep=${pid}` : `/articles/${pid}`);
  if (id) {
    if (!UUID.test(id)) return { error: "That post could not be saved." };
    const { data: cur } = await supabase.from("posts").select("status").eq("id", id).eq("author_id", user.id).maybeSingle();
    if (!cur) return { error: "That post could not be found." };
    if (cur.status === "pending") return { error: "This post is under review, so you cannot edit it right now." };
    // A trusted author (or editor/admin) stays live when they edit; a regular student's edit goes back for review.
    const next = cur.status === "published" ? (autoPublish ? "published" : "pending") : wanted;
    const { error } = await supabase.from("posts").update({ ...parsed.data, status: next, ...(next !== "draft" ? { review_note: null } : {}) }).eq("id", id).eq("author_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/articles"); revalidatePath("/podcast"); revalidatePath("/my-posts");
    redirect(next === "draft" ? `/edit/${id}?saved=1` : next === "published" ? view(parsed.data.post_type, id) : "/my-posts?submitted=1");
  }
  const { data: row, error } = await supabase.from("posts").insert({ author_id: user.id, status: wanted, ...parsed.data }).select("id").single();
  if (error) return { error: error.message };
  redirect(wanted === "draft" ? `/edit/${row.id}?saved=1` : wanted === "published" ? view(parsed.data.post_type, row.id) : "/my-posts?submitted=1");
}

/** Quiet background save used while someone is writing. Only ever touches drafts. */
export async function autosavePost(fd: FormData): Promise<{ id?: string; error?: string; skipped?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to keep saving." };
  const parsed = parseForm(fd, true);
  if ("error" in parsed) return { error: parsed.error };
  if (!String(fd.get("title") || "").trim() && !String(fd.get("content") || "").trim()) return { skipped: true };
  const id = String(fd.get("post_id") || "");
  if (id) {
    if (!UUID.test(id)) return { error: "That post could not be saved." };
    const { error, count } = await supabase.from("posts").update({ ...parsed.data }, { count: "exact" }).eq("id", id).eq("author_id", user.id).eq("status", "draft");
    if (error) return { error: error.message };
    if (!count) return { error: "This post is no longer a draft, so it was not changed." };
    return { id };
  }
  const { data: row, error } = await supabase.from("posts").insert({ author_id: user.id, status: "draft", ...parsed.data }).select("id").single();
  if (error) return { error: error.message };
  return { id: row.id as string };
}

export async function toggleLike(postId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to like." };
  const { data: existing } = await supabase.from("likes").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing) await supabase.from("likes").delete().eq("id", existing.id);
  else await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
  return { liked: !existing };
}

export async function addComment(postId: string, content: string, parentId: string | null = null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to comment." };
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content, parent_id: parentId || null });
  if (error) return { error: error.message };
  // Tell the post author (and, for a reply, the parent comment's author) that someone commented.
  const { data: post } = await supabase.from("posts").select("author_id, title").eq("id", postId).maybeSingle();
  const targets = new Set<string>();
  if (post && post.author_id !== user.id) targets.add(post.author_id);
  if (parentId) {
    const { data: parent } = await supabase.from("comments").select("user_id").eq("id", parentId).maybeSingle();
    if (parent && parent.user_id !== user.id) targets.add(parent.user_id);
  }
  for (const uid of targets) {
    await supabase.from("notifications").insert({ user_id: uid, kind: "comment", post_id: postId, message: `Someone commented on “${post?.title ?? "your post"}”.`.slice(0, 300) });
  }
  return { ok: true };
}

/** An editor approves a post without editing it. Only the status changes, and the author is told. */
export async function approvePost(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { data: prev } = await supabase.from("posts").select("status, author_id, title").eq("id", id).maybeSingle();
  if (!prev) return { error: "That post could not be found." };
  const publishing = prev.status !== "published";
  const { error, count } = await supabase.from("posts").update({
    status: "published",
    ...(publishing ? { review_note: null, reviewed_at: new Date().toISOString(), reviewed_by: user.id } : {}),
  }, { count: "exact" }).eq("id", id); // RLS: staff only
  if (error) return { error: error.message };
  if (!count) return { error: "Only editors and admins can publish." };
  if (publishing && prev.author_id !== user.id) {
    await supabase.from("notifications").insert({ user_id: prev.author_id, kind: "published", post_id: id, message: `Your post “${prev.title}” is now published.`.slice(0, 300) });
  }
  revalidatePath("/admin"); revalidatePath("/articles"); revalidatePath("/podcast"); revalidatePath("/my-posts");
  return { ok: true };
}

export async function saveSetting(section: string, content_json: Record<string, string>) {
  const { error } = await createClient().from("site_settings").upsert({ section_name: section, content_json }, { onConflict: "section_name" });
  revalidatePath("/");
  return error ? { error: error.message } : { ok: true };
}

export async function setRole(userId: string, role: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  if (!["student", "editor", "admin"].includes(role)) return { error: "That role does not exist." };
  if (userId === user.id) return { error: "You cannot change your own role." };
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target) return { error: "That user could not be found." };
  // Only the site owner (the first admin) can promote to admin or demote an admin.
  const touchesAdmin = target.role === "admin" || role === "admin";
  if (touchesAdmin) {
    const { data: owner } = await supabase.from("profiles").select("id").eq("role", "admin").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!owner || owner.id !== user.id) return { error: "Only the site owner can add or remove admins." };
  }
  const { error, count } = await supabase.from("profiles").update({ role }, { count: "exact" }).eq("id", userId); // RLS: admin only
  if (error) return { error: error.message };
  if (!count) return { error: "Only admins can change roles." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setTrusted(userId: string, trusted: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  if (userId === user.id) return { error: "You cannot change your own trusted setting." };
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target) return { error: "That user could not be found." };
  if (target.role !== "student") return { error: "Only students can be marked trusted." };
  const { error, count } = await supabase.from("profiles").update({ trusted }).eq("id", userId).eq("role", "student"); // RLS: admin only
  if (error) return { error: error.message };
  if (!count) return { error: "Only admins can change this." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePost(id: string) {
  const supabase = createClient();
  const { data: post } = await supabase.from("posts").select("metadata").eq("id", id).maybeSingle();
  const { error, count } = await supabase.from("posts").delete({ count: "exact" }).eq("id", id); // RLS: staff only
  if (error) return { error: error.message };
  if (!count) return { error: "You do not have permission to delete this post." };
  const m = (post?.metadata ?? {}) as Record<string, unknown>;
  const paths = [m.media_url, m.audio_url, m.cover_url]
    .map((u) => String(u ?? "").match(/\/storage\/v1\/object\/public\/audio\/(.+)$/))
    .filter((x): x is RegExpMatchArray => !!x).map((x) => decodeURIComponent(x[1]));
  if (paths.length) await supabase.storage.from("audio").remove(paths); // best effort
  revalidatePath("/admin"); revalidatePath("/articles"); revalidatePath("/podcast");
  return { ok: true };
}
