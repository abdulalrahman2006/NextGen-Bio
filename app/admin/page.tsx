import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import AdminClient from "./AdminClient";
import { mergeSettings } from "@/lib/defaults";
import { plain } from "@/lib/text";

export default async function Admin() {
  const { supabase, user, profile } = await getProfile();
  if (!profile || !["admin", "editor"].includes(profile.role)) redirect("/");
  // The list only needs light columns; a post's full text is loaded when an editor opens it.
  const COLS = "id,title,post_type,status,created_at,author_id,category,tags,profiles(full_name)";
  type PostsRes = { data: unknown[] | null; error: unknown };
  let postsRes: PostsRes = await supabase.from("posts").select(`${COLS},review_note`).order("created_at", { ascending: false }).limit(500);
  if (postsRes.error) postsRes = await supabase.from("posts").select(COLS).order("created_at", { ascending: false }).limit(500); // before the step 5 SQL
  const [{ data: posts }, { data: settings }, { data: users }] = await Promise.all([
    Promise.resolve(postsRes),
    supabase.from("site_settings").select("*"),
    supabase.from("profiles").select("*").order("created_at"),
  ]);
  type Raw = { id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string; profiles: { full_name: string | null } | null };
  const { data: rawReports } = await supabase.from("reports").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(200);
  const rr = (rawReports ?? []) as Raw[];
  const idsOf = (t: string) => [...new Set(rr.filter((r) => r.target_type === t).map((r) => r.target_id))];
  const pRows = idsOf("post").length ? (await supabase.from("posts").select("id,title,post_type,status,content").in("id", idsOf("post"))).data ?? [] : [];
  const cRows = idsOf("comment").length ? (await supabase.from("comments").select("id,content,post_id,profiles(full_name)").in("id", idsOf("comment"))).data ?? [] : [];
  const uRows = idsOf("profile").length ? (await supabase.from("profiles").select("id,full_name").in("id", idsOf("profile"))).data ?? [] : [];
  const reports = rr.map((r) => {
    let target = { label: "Removed", preview: "This item no longer exists.", href: "", exists: false };
    let targetStatus: string | undefined;
    if (r.target_type === "post") {
      const p = pRows.find((x) => x.id === r.target_id);
      if (p) { targetStatus = p.status; target = { label: `Post: ${p.title}`, preview: plain(p.content, 200), href: p.post_type === "audio" ? `/podcast?ep=${p.id}` : `/articles/${p.id}`, exists: true }; }
    } else if (r.target_type === "comment") {
      const c = cRows.find((x) => x.id === r.target_id) as { id: string; content: string; post_id: string; profiles: { full_name: string | null } | null } | undefined;
      if (c) target = { label: `Comment by ${c.profiles?.full_name ?? "a student"}`, preview: c.content.slice(0, 300), href: `/articles/${c.post_id}`, exists: true };
    } else {
      const u = uRows.find((x) => x.id === r.target_id);
      if (u) target = { label: `Profile: ${u.full_name ?? "Student"}`, preview: "", href: `/u/${u.id}`, exists: true };
    }
    return { id: r.id, type: r.target_type, targetId: r.target_id, reason: r.reason, details: r.details, status: r.status, created_at: r.created_at, reporter: r.profiles?.full_name ?? "Unknown", target, targetStatus };
  });
  const { data: feedback } = profile.role === "admin"
    ? await supabase.from("feedback").select("id, kind, message, status, created_at, profiles(full_name)").order("created_at", { ascending: false })
    : { data: [] };
  const admins = ((users ?? []) as { id: string; role: string; created_at?: string }[]).filter((u) => u.role === "admin").sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  const isOwner = admins.length > 0 && admins[0].id === (user?.id ?? "");
  return <AdminClient role={profile.role} meId={user?.id ?? ""} isOwner={isOwner} posts={(posts ?? []) as never} settings={mergeSettings((settings ?? []) as never)} users={users ?? []} feedback={(feedback ?? []) as never} reports={reports} />;
}
