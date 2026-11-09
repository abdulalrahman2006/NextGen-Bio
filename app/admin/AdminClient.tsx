"use client";
import { Fragment, useRef, useState, useTransition } from "react";
import { approvePost, deletePost, saveSetting, setRole, setTrusted, suspendUser, unsuspendUser, deleteAccount } from "@/app/actions/posts";
import { setFeedbackStatus, deleteFeedback } from "@/app/actions/feedback";
import { setReportStatus, deleteComment, unpublishPost } from "@/app/actions/moderation";
import { requestChanges, flagPublished, clearFlag } from "@/app/actions/review";
import { createClient } from "@/lib/supabase/client";
import { youtubeId } from "@/lib/youtube";
import Markdown from "@/components/Markdown";
import type { Post, Profile } from "@/lib/types";

type Setting = { id: string; section_name: string; content_json: Record<string, string> };
type ReportItem = { id: string; type: string; targetId: string; reason: string; details: string | null; status: string; created_at: string; reporter: string; target: { label: string; preview: string; href: string; exists: boolean }; targetStatus?: string };
type AdminPost = { id: string; title: string; post_type: string; status: string; created_at: string; author_id: string; category: string; tags: string[] | null; review_note?: string | null; profiles: { full_name: string | null } | null };
type Feedback = { id: string; kind: string; message: string; status: string; created_at: string; profiles: { full_name: string | null } | null };
const f = "w-full border-2 border-slate9 bg-transparent p-2";

export default function AdminClient({ role, meId, isOwner, posts, settings, users, feedback, reports }: { role: string; meId: string; isOwner: boolean; posts: AdminPost[]; settings: Setting[]; users: Profile[]; feedback: Feedback[]; reports: ReportItem[] }) {
  const [tab, setTab] = useState<"posts" | "reports" | "pages" | "users" | "feedback">("posts");
  const unread = feedback.filter((x) => x.status === "new").length;
  const openReports = reports.filter((x) => x.status === "open").length;
  const tabs = [["posts", "Posts"], ["reports", `Reports${openReports ? ` (${openReports})` : ""}`], ["pages", "Static pages"], ...(role === "admin" ? [["users", "Users"], ["feedback", `Feedback${unread ? ` (${unread})` : ""}`]] : [])] as [typeof tab, string][];
  return (
    <section className="pt-28 pr-6 pb-16">
      <h1 className="mb-8 text-4xl font-black tracking-tight md:text-6xl">Admin</h1>
      <div className="flex gap-2 mb-8 border-b-2 border-slate9">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={`px-5 py-2 font-black ${tab === k ? "bg-slate9 text-paper" : "hover:bg-slate3"}`}>{l}</button>
        ))}
      </div>
      {tab === "posts" && <PostsTab posts={posts} />}
      {tab === "pages" && <PagesTab settings={settings} />}
      {tab === "users" && role === "admin" && <UsersTab users={users} meId={meId} isOwner={isOwner} />}
      {tab === "feedback" && role === "admin" && <FeedbackTab items={feedback} />}
      {tab === "reports" && <ReportsTab items={reports} />}
    </section>
  );
}

function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex items-center gap-4 text-sm">
      <span className="text-slate7">{total} {total === 1 ? "result" : "results"}</span>
      {pages > 1 && (
        <>
          <button disabled={page === 0} onClick={() => onPage(page - 1)} className="font-bold underline disabled:opacity-40 disabled:no-underline">Previous</button>
          <span>Page {page + 1} of {pages}</span>
          <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="font-bold underline disabled:opacity-40 disabled:no-underline">Next</button>
        </>
      )}
    </div>
  );
}

const RANK: Record<string, number> = { pending: 0, "needs changes": 1, draft: 2, published: 3 };

function PostsTab({ posts }: { posts: AdminPost[] }) {
  const SIZE = 12;
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [kindF, setKindF] = useState("all");
  const [page, setPage] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const latest = useRef("");
  const [sel, setSel] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [local, setLocal] = useState<Record<string, { status: string; note: string | null }>>({});
  const [pending, start] = useTransition();

  const stateOf = (p: { id: string; status: string; review_note?: string | null }) => local[p.id] ?? { status: p.status, note: p.review_note ?? null };
  const labelOf = (p: AdminPost) => { const s = stateOf(p); return s.status === "draft" ? (s.note ? "needs changes" : "draft") : s.status; };
  const filtered = posts.filter((p) => {
    if (removed.has(p.id)) return false;
    if (statusF !== "all" && labelOf(p) !== statusF) return false;
    if (kindF !== "all" && (p.post_type === "audio" ? "podcast" : p.post_type) !== kindF) return false;
    const needle = q.trim().toLowerCase();
    return !needle || p.title.toLowerCase().includes(needle) || (p.profiles?.full_name ?? "").toLowerCase().includes(needle) || (p.tags ?? []).some((t) => t.includes(needle));
  }).sort((a, b) => (RANK[labelOf(a)] ?? 4) - (RANK[labelOf(b)] ?? 4) || b.created_at.localeCompare(a.created_at));
  const counts = posts.reduce<Record<string, number>>((m, p) => { if (!removed.has(p.id)) m[labelOf(p)] = (m[labelOf(p)] ?? 0) + 1; return m; }, {});
  const pages = Math.max(1, Math.ceil(filtered.length / SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * SIZE, cur * SIZE + SIZE);
  const selState = sel ? stateOf({ id: sel.id, status: sel.status, review_note: sel.review_note }) : null;

  const open = async (p: AdminPost) => {
    latest.current = p.id; setSelId(p.id); setSel(null); setLoading(true); setMsg(""); setConfirming(false); setAsking(false); setNote("");
    const { data, error } = await createClient().from("posts").select("*, profiles(full_name)").eq("id", p.id).maybeSingle();
    if (latest.current !== p.id) return;
    setLoading(false);
    if (error || !data) { setMsg(error?.message ?? "Could not load that post."); return; }
    setSel(data as Post);
  };
  const publish = () => start(async () => {
    const r = await approvePost(sel!.id);
    if (!r.error) setLocal((l) => ({ ...l, [sel!.id]: { status: "published", note: null } }));
    setMsg(r.error ?? "Published. The author has been told.");
  });
  const unpublish = () => start(async () => {
    const r = await unpublishPost(sel!.id);
    if (!r.error) setLocal((l) => ({ ...l, [sel!.id]: { status: "draft", note: null } }));
    setMsg(r.error ?? "Unpublished.");
  });
  const sendNote = () => start(async () => {
    if (selState?.status === "published") {
      const r = await flagPublished(sel!.id, note);
      if (r.error) { setMsg(r.error); return; }
      setLocal((l) => ({ ...l, [sel!.id]: { status: "published", note: note.trim() } }));
      setAsking(false); setNote(""); setMsg("Flagged. The post stays live and the author has been told.");
      return;
    }
    const r = await requestChanges(sel!.id, note);
    if (r.error) { setMsg(r.error); return; }
    setLocal((l) => ({ ...l, [sel!.id]: { status: "draft", note: note.trim() } }));
    setAsking(false); setNote(""); setMsg("Sent back to the author with your note.");
  });
  const removeFlag = () => start(async () => {
    const r = await clearFlag(sel!.id);
    if (r.error) { setMsg(r.error); return; }
    setLocal((l) => ({ ...l, [sel!.id]: { status: "published", note: null } }));
    setMsg("Flag cleared.");
  });
  const remove = () => start(async () => {
    const r = await deletePost(sel!.id);
    if (r.error) { setMsg(r.error); return; }
    setRemoved((s) => new Set(s).add(sel!.id)); setSel(null); setSelId(null); setConfirming(false); setMsg("");
  });

  const badge = (lab: string) => (lab === "published" ? "text-ok" : lab === "pending" ? "font-bold text-warn" : lab === "needs changes" ? "font-bold text-danger" : "text-slate7");
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="min-w-0 flex-1 text-sm font-bold">Search
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Title, author or tag" className={f} />
          </label>
          <label className="text-sm font-bold">Status
            <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(0); }} className={f}>
              <option value="all">All</option>
              <option value="pending">Waiting for review ({counts.pending ?? 0})</option><option value="needs changes">Needs changes ({counts["needs changes"] ?? 0})</option>
              <option value="draft">Drafts ({counts.draft ?? 0})</option><option value="published">Published ({counts.published ?? 0})</option>
            </select>
          </label>
          <label className="text-sm font-bold">Type
            <select value={kindF} onChange={(e) => { setKindF(e.target.value); setPage(0); }} className={f}>
              <option value="all">All</option><option value="article">Article</option><option value="idea">Idea</option><option value="podcast">Podcast</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b-2 border-slate9"><th className="py-2">Title</th><th>Type</th><th>Author</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} onClick={() => open(p)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(p)}
                  className={`cursor-pointer border-b border-slate3 hover:bg-slate3/50 ${selId === p.id ? "bg-slate3/50" : ""}`}>
                  <td className="py-2 pr-2 font-bold" dir="auto">{p.title}</td>
                  <td>{p.post_type === "audio" ? "podcast" : p.post_type}</td>
                  <td>{p.profiles?.full_name ?? "—"}</td>
                  <td><span className={badge(labelOf(p))}>{labelOf(p)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && (
            <p className="py-6 text-slate5">
              Nothing matches.{" "}
              {statusF !== "all" && <button onClick={() => { setStatusF("all"); setPage(0); }} className="font-bold text-slate9 underline">Look in all statuses</button>}
            </p>
          )}
        </div>
        <Pager page={cur} pages={pages} total={filtered.length} onPage={setPage} />
      </div>
      <div>
        {!selId ? <p className="text-xl text-slate5">Select a post to review it.</p> : loading ? <p className="text-slate5">Loading…</p> : !sel ? <p role="alert" className="text-danger">{msg}</p> : (
          <div className="space-y-4">
            {selState?.status === "draft" && selState.note && (
              <p className="border-l-4 border-gold pl-3" dir="auto"><b>Waiting on the author.</b> Your note: {selState.note}</p>
            )}
            {selState?.status === "published" && selState.note && (
              <div className="border-l-4 border-gold pl-3">
                <p dir="auto"><b>Flagged, still live.</b> {selState.note}</p>
                <button disabled={pending} onClick={removeFlag} className="mt-2 text-sm font-bold underline">Clear flag</button>
              </div>
            )}
            <div className="border-t border-slate3 pt-3">
              <p className="text-sm text-slate7">{sel.profiles?.full_name ?? "—"} · {sel.post_type === "audio" ? "podcast" : sel.post_type} · {new Date(sel.created_at).toLocaleDateString()}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight" dir="auto">{sel.title}</h2>
              {(sel.tags ?? []).length > 0 && (
                <p className="mt-2 flex flex-wrap gap-2">{(sel.tags as string[]).map((t) => <span key={t} className="bg-slate3/50 px-3 py-1 text-sm capitalize">{t}</span>)}</p>
              )}
            </div>
            {sel.post_type === "audio" ? <MediaReview post={sel} /> : (
              <div className="border-2 border-slate3 p-4"><Markdown>{sel.content}</Markdown></div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {selState?.status !== "published" && <button disabled={pending} onClick={publish} className="bg-slate9 px-5 py-2 font-black text-paper hover:bg-gold hover:text-night">Publish</button>}
              {selState?.status !== "draft" && <button disabled={pending} onClick={() => setAsking(!asking)} aria-expanded={asking} className="border-2 border-gold px-5 py-2 font-bold hover:bg-gold hover:text-night">{selState?.status === "published" ? "Flag an issue" : "Request changes"}</button>}
              {selState?.status === "published" && <button disabled={pending} onClick={unpublish} className="underline">Unpublish</button>}
              <span role="status" className="text-sm text-slate7">{msg}</span>
            </div>
            {asking && (
              <div className="border-2 border-gold p-4">
                <label className="block font-bold">{selState?.status === "published" ? "What's wrong with it? (the post stays live; the author sees this note on My posts)" : "Note to the author (they will see it on My posts)"}
                  <textarea dir="auto" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: please add a source for the second claim and shorten the introduction." className={f} />
                </label>
                <button disabled={pending || note.trim().length < 3} onClick={sendNote} className="mt-3 bg-slate9 px-5 py-2 font-black text-paper hover:bg-gold hover:text-night disabled:opacity-50">{selState?.status === "published" ? "Flag it" : "Send back to the author"}</button>
              </div>
            )}
            <div className="border-t-2 border-slate9 pt-4">
              {!confirming ? (
                <button onClick={() => setConfirming(true)} className="font-bold text-danger underline">Delete post</button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-bold">Delete “{sel.title}” permanently? Its likes, comments and any uploaded file are removed too.</p>
                  <button disabled={pending} onClick={remove} className="bg-red-700 px-4 py-2 font-black text-white">Yes, delete</button>
                  <button onClick={() => setConfirming(false)} className="underline">Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PagesTab({ settings }: { settings: Setting[] }) {
  const [forms, setForms] = useState(Object.fromEntries(settings.map((s) => [s.section_name, s.content_json])));
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  return (
    <div className="space-y-10 max-w-2xl">
      {Object.entries(forms).map(([section, json]) => (
        <div key={section} className="hairline p-5">
          <h2 className="font-black text-2xl mb-4">{section}</h2>
          {Object.entries(json).map(([k, v]) => (
            <label key={k} className="block font-bold mb-3">{k}
              {v.length > 70 ? <textarea rows={4} value={v} onChange={(e) => setForms({ ...forms, [section]: { ...json, [k]: e.target.value } })} className={f} /> : <input value={v} onChange={(e) => setForms({ ...forms, [section]: { ...json, [k]: e.target.value } })} className={f} />}
            </label>
          ))}
          <button onClick={() => start(async () => { const r = await saveSetting(section, forms[section]); setMsg(r.error ?? `${section} saved. The homepage is updated.`); })}
            className="bg-slate9 text-paper px-5 py-2 font-black hover:bg-gold hover:text-night">Save {section}</button>
        </div>
      ))}
      <p role="status" className="text-slate7">{msg}</p>
    </div>
  );
}

function UsersTab({ users, meId, isOwner }: { users: Profile[]; meId: string; isOwner: boolean }) {
  const SIZE = 15;
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState("");
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [trusted, setTrustedState] = useState<Record<string, boolean>>({});
  const [suspended, setSuspended] = useState<Record<string, { until: string | null; reason: string | null } | undefined>>({});
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [removedUsers, setRemovedUsers] = useState<Set<string>>(new Set());
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");
  const [, start] = useTransition();
  const stateOf = (u: Profile) => suspended[u.id] ?? { until: u.suspended_until ?? null, reason: u.suspension_reason ?? null };
  const filtered = users.filter((u) => !removedUsers.has(u.id) && (roleF === "all" || (roles[u.id] ?? u.role) === roleF) && (!q.trim() || (u.full_name ?? "").toLowerCase().includes(q.trim().toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * SIZE, cur * SIZE + SIZE);
  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="min-w-0 flex-1 text-sm font-bold">Search by name
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className={f} />
        </label>
        <label className="text-sm font-bold">Role
          <select value={roleF} onChange={(e) => { setRoleF(e.target.value); setPage(0); }} className={f}>
            <option value="all">All</option><option value="student">Students</option><option value="editor">Editors</option><option value="admin">Admins</option>
          </select>
        </label>
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b-2 border-slate9"><th className="py-2">Name</th><th>Role</th></tr></thead>
        <tbody>
          {shown.map((u) => {
            const canSuspend = u.id !== meId && !(u.role === "admin" && !isOwner);
            const st = stateOf(u);
            const isSuspended = !!st.until && new Date(st.until) > new Date();
            const open = openFor === u.id;
            return (
              <Fragment key={u.id}>
                <tr className="border-b border-slate3">
                  <td className="py-2 font-bold" dir="auto">
                    {u.full_name ?? u.id.slice(0, 8)}{u.id === meId && <span className="ml-2 text-xs font-normal text-slate5">(you)</span>}
                    {canSuspend && (
                      <button className={`ml-3 text-xs font-bold underline ${isSuspended ? "text-danger" : "text-slate7"}`}
                        onClick={() => { setOpenFor(open ? null : u.id); setReason(""); setDays(7); }}>
                        {isSuspended ? "Suspended" : "Suspend"}
                      </button>
                    )}
                    {canSuspend && (deleteConfirm === u.id ? (
                      <span className="ml-3 inline-flex items-center gap-2 text-xs">
                        <span>Delete for good?</span>
                        <button className="font-bold text-danger underline" onClick={() => start(async () => {
                          const r = await deleteAccount(u.id);
                          if (r.error) { setMsg(r.error); return; }
                          setRemovedUsers((s) => new Set(s).add(u.id)); setDeleteConfirm(null); setMsg("Account deleted.");
                        })}>Yes, delete</button>
                        <button className="underline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="ml-3 text-xs font-bold text-danger underline" onClick={() => setDeleteConfirm(u.id)}>Delete account</button>
                    ))}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-3">
                      <select value={roles[u.id] ?? u.role} disabled={u.id === meId || (u.role === "admin" && !isOwner)} aria-label={`Role for ${u.full_name}`} className="border-2 border-slate9 bg-transparent p-1 disabled:opacity-50"
                        onChange={(e) => {
                          const v = e.target.value;
                          setRoles((r) => ({ ...r, [u.id]: v }));
                          start(async () => { const r = await setRole(u.id, v); if (r.error) { setRoles((rr) => ({ ...rr, [u.id]: u.role })); setMsg(r.error); } else setMsg("Role updated."); });
                        }}>
                        {["student", "editor", "admin"].map((r) => <option key={r}>{r}</option>)}
                      </select>
                      {u.role === "student" && (
                        <label className="flex items-center gap-1 text-sm">
                          <input type="checkbox" checked={trusted[u.id] ?? !!u.trusted} disabled={u.id === meId} aria-label={`Trusted for ${u.full_name}`}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setTrustedState((t) => ({ ...t, [u.id]: v }));
                              start(async () => { const r = await setTrusted(u.id, v); if (r.error) { setTrustedState((t) => ({ ...t, [u.id]: !v })); setMsg(r.error); } else setMsg(v ? "Marked trusted. Their posts now publish immediately." : "Removed trusted. Their posts need review again."); });
                            }} />
                          Trusted
                        </label>
                      )}
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-slate3 bg-slate3/20">
                    <td colSpan={2} className="py-4">
                      {isSuspended ? (
                        <div className="space-y-2">
                          <p className="font-bold text-danger">Suspended until {new Date(st.until!).toLocaleString()}</p>
                          {st.reason && <p dir="auto"><b>Reason:</b> {st.reason}</p>}
                          <button className="bg-slate9 px-4 py-2 text-sm font-bold text-paper hover:bg-gold hover:text-night" onClick={() => start(async () => {
                            const r = await unsuspendUser(u.id);
                            if (r.error) { setMsg(r.error); return; }
                            setSuspended((s) => ({ ...s, [u.id]: { until: null, reason: null } })); setOpenFor(null); setMsg("Suspension lifted.");
                          })}>Lift suspension</button>
                        </div>
                      ) : (
                        <div className="max-w-md space-y-3">
                          <div className="flex gap-2">
                            {[1, 3, 7, 30].map((d) => (
                              <button key={d} onClick={() => setDays(d)} className={`border-2 px-3 py-1 text-sm font-bold ${days === d ? "border-slate9 bg-slate9 text-paper" : "border-slate3"}`}>{d} day{d > 1 ? "s" : ""}</button>
                            ))}
                          </div>
                          <label className="block text-sm font-bold">Reason (the student will see this)
                            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} dir="auto" className={f} placeholder="For example: repeated harassment in comments after a warning." />
                          </label>
                          <div className="flex gap-3">
                            <button disabled={reason.trim().length < 3} onClick={() => {
                              const until = new Date(Date.now() + days * 86400000).toISOString();
                              start(async () => {
                                const r = await suspendUser(u.id, until, reason);
                                if (r.error) { setMsg(r.error); return; }
                                setSuspended((s) => ({ ...s, [u.id]: { until, reason } })); setOpenFor(null); setMsg("Suspended.");
                              });
                            }} className="bg-danger px-4 py-2 text-sm font-bold text-paper disabled:opacity-50">Suspend for {days} day{days > 1 ? "s" : ""}</button>
                            <button onClick={() => setOpenFor(null)} className="text-sm underline">Cancel</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {shown.length === 0 && <p className="py-6 text-slate5">No one matches.</p>}
      <Pager page={cur} pages={pages} total={filtered.length} onPage={setPage} />
      <p role="status" className="mt-2 text-slate7">{msg}</p>
    </div>
  );
}

function MediaReview({ post }: { post: Post }) {
  const m = (post.metadata ?? {}) as Record<string, unknown>;
  const raw = String(m.media_url ?? m.audio_url ?? "");
  const type = String(m.media_type ?? "audio");
  const yt = type === "youtube" ? youtubeId(raw) : null;
  const cover = typeof m.cover_url === "string" ? m.cover_url : "";
  const notes = Array.isArray(m.notes) ? m.notes.map(String) : [];
  const transcript = String(m.transcript ?? "");
  return (
    <div className="border-2 border-slate9 p-4 space-y-4">
      {yt ? (
        <iframe title="YouTube preview" src={`https://www.youtube-nocookie.com/embed/${yt}`} allowFullScreen className="aspect-video w-full border-0 bg-black" />
      ) : raw && type === "video" ? (
        <video controls preload="metadata" src={raw} className="w-full max-h-80 bg-black" />
      ) : raw ? (
        <audio controls preload="metadata" src={raw} className="w-full" />
      ) : <p className="text-danger font-semibold">No audio, video or link is attached to this episode.</p>}
      {raw && <p className="text-sm break-all text-slate7">Source: {raw}</p>}
      {cover && <div className="flex items-center gap-3"><img src={cover} alt="Cover" className="h-20 w-20 rounded-full object-cover" /><span className="text-sm text-slate7">Cover shown on the disc</span></div>}
      <dl className="space-y-2 text-sm">
        <div><dt className="font-bold">Guest</dt><dd className="text-slate7">{String(m.guest ?? "—")}</dd></div>
        <div><dt className="font-bold">Length</dt><dd className="text-slate7">{String(m.duration ?? "—")}</dd></div>
        <div><dt className="font-bold">Timestamps</dt><dd className="whitespace-pre-wrap text-slate7">{notes.length ? notes.join("\n") : "—"}</dd></div>
        <div><dt className="font-bold">Transcript</dt><dd className="whitespace-pre-wrap text-slate7" dir="auto">{transcript || "—"}</dd></div>
      </dl>
    </div>
  );
}

function FeedbackTab({ items }: { items: Feedback[] }) {
  const [filter, setFilter] = useState<"all" | "new" | "reviewed" | "resolved">("all");
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [local, setLocal] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const label: Record<string, string> = { suggestion: "Suggestion", complaint: "Complaint", problem: "Problem" };
  const rows = items.filter((x) => !gone.has(x.id) && (filter === "all" || (local[x.id] ?? x.status) === filter));
  return (
    <div className="max-w-3xl">
      <div className="flex gap-4 mb-6">
        {(["all", "new", "reviewed", "resolved"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`font-bold capitalize ${filter === k ? "underline" : "hover:underline"}`}>{k}</button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-slate5 text-xl">Nothing here yet.</p>}
      <ul className="space-y-6">
        {rows.map((x) => {
          const status = local[x.id] ?? x.status;
          return (
            <li key={x.id} className="border-2 border-slate9 p-5">
              <p className="text-sm text-slate7">{label[x.kind] ?? x.kind} · {new Date(x.created_at).toLocaleString()} · {x.profiles?.full_name ?? "Anonymous"}</p>
              <p className="mt-3 text-lg whitespace-pre-wrap">{x.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <select value={status} aria-label="Status" onChange={(e) => { const v = e.target.value; setLocal({ ...local, [x.id]: v }); start(async () => { const r = await setFeedbackStatus(x.id, v); setMsg(r.error ?? ""); }); }} className="border-2 border-slate9 bg-transparent p-1">
                  {["new", "reviewed", "resolved"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <button onClick={() => start(async () => { const r = await deleteFeedback(x.id); if (r.error) setMsg(r.error); else setGone(new Set(gone).add(x.id)); })} className="text-danger font-bold underline">Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
      <p role="status" className="mt-4 text-danger">{msg}</p>
    </div>
  );
}

function ReportsTab({ items }: { items: ReportItem[] }) {
  const [filter, setFilter] = useState<"open" | "reviewed" | "dismissed" | "all">("open");
  const [local, setLocal] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const REASON: Record<string, string> = { spam: "Spam or advertising", offensive: "Offensive or harassing", misinformation: "Wrong or misleading science", copyright: "Copyright or plagiarism", other: "Something else" };
  const statusOf = (r: ReportItem) => local[r.id] ?? r.status;
  const rows = items.filter((r) => filter === "all" || statusOf(r) === filter);
  const setStatus = (id: string, s: string) => { setLocal((l) => ({ ...l, [id]: s })); start(async () => { const x = await setReportStatus(id, s); setMsg(x.error ?? ""); }); };
  const act = (r: ReportItem, fn: (id: string) => Promise<{ error?: string }>) => start(async () => {
    const x = await fn(r.targetId);
    if (x.error) { setMsg(x.error); return; }
    setRemoved((s) => new Set(s).add(r.id)); setLocal((l) => ({ ...l, [r.id]: "reviewed" }));
    const y = await setReportStatus(r.id, "reviewed"); setMsg(y.error ?? "");
  });
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex gap-4">
        {(["open", "reviewed", "dismissed", "all"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`font-bold capitalize ${filter === k ? "underline" : "hover:underline"}`}>{k}</button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-xl text-slate5">No reports here.</p>}
      <ul className="space-y-6">
        {rows.map((r) => (
          <li key={r.id} className="border-2 border-slate9 p-5">
            <p className="text-sm text-slate7">{REASON[r.reason] ?? r.reason} · reported by {r.reporter} · {new Date(r.created_at).toLocaleString()} · <b>{statusOf(r)}</b></p>
            <p className="mt-3 text-lg font-black">{r.target.label}</p>
            {r.target.preview && <p className="mt-1 whitespace-pre-wrap text-slate7">{r.target.preview}</p>}
            {r.details && <p className="mt-3 border-l-2 border-gold pl-3"><b>Reporter says:</b> {r.details}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {r.target.exists && r.target.href && <a href={r.target.href} target="_blank" rel="noopener noreferrer" className="font-bold underline">Open</a>}
              {removed.has(r.id) ? <span className="text-slate7">Action taken</span> : (
                <>
                  {r.type === "comment" && r.target.exists && <button onClick={() => act(r, deleteComment)} className="font-bold text-danger underline">Delete comment</button>}
                  {r.type === "post" && r.target.exists && r.targetStatus === "published" && <button onClick={() => act(r, unpublishPost)} className="font-bold text-danger underline">Unpublish post</button>}
                </>
              )}
              {statusOf(r) === "open" ? (
                <>
                  <button onClick={() => setStatus(r.id, "reviewed")} className="underline">Mark reviewed</button>
                  <button onClick={() => setStatus(r.id, "dismissed")} className="underline">Dismiss</button>
                </>
              ) : <button onClick={() => setStatus(r.id, "open")} className="underline">Reopen</button>}
            </div>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-4 text-danger">{msg}</p>
    </div>
  );
}
