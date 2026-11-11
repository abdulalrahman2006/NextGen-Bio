"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Heart, MessageCircle, Repeat2, Share2, Bookmark } from "lucide-react";
import { toggleLike, addComment } from "@/app/actions/posts";
import { deleteComment } from "@/app/actions/moderation";
import { repost, undoRepost } from "@/app/actions/reposts";
import { toggleSave } from "@/app/actions/saves";
import { createClient } from "@/lib/supabase/client";
import ReportButton from "./ReportButton";

interface Comment { id: string; user_id: string; content: string; created_at: string; parent_id?: string | null; profiles: { username?: string; full_name: string | null } | null }

export default function PostActions({ postId, likes, liked: likedInit, comments, reposts = 0, reposted: repostedInit = false, repostNote: repostNoteInit = "", saved: savedInit = false, defaultOpen = false, reportable = false }: {
  postId: string; likes: number; liked: boolean; comments: number; reposts?: number; reposted?: boolean; repostNote?: string; saved?: boolean; defaultOpen?: boolean; reportable?: boolean;
}) {
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(likedInit);
  const [n, setN] = useState(comments);
  const [open, setOpen] = useState(defaultOpen);
  const [list, setList] = useState<Comment[] | null>(null);
  const [me, setMe] = useState<{ id: string; staff: boolean } | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [repostCount, setRepostCount] = useState(reposts);
  const [reposted, setReposted] = useState(repostedInit);
  const [repostNote, setRepostNote] = useState(repostNoteInit);
  const [composing, setComposing] = useState(false);
  const [saved, setSaved] = useState(savedInit);
  const [, start] = useTransition();

  const load = async () => {
    const sb = createClient();
    const { data } = await sb.from("comments").select("id, user_id, content, created_at, parent_id, profiles(username, full_name)").eq("post_id", postId).order("created_at");
    setList((data as unknown as Comment[]) ?? []);
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setMe({ id: user.id, staff: ["admin", "editor"].includes(p?.role ?? "") });
    }
  };
  useEffect(() => { if (defaultOpen) load(); }, []); // eslint-disable-line

  const toggle = async () => { const next = !open; setOpen(next); if (next && list === null) await load(); };
  const like = () => {
    const was = liked;
    setLiked(!was); setCount((c) => c + (was ? -1 : 1));
    start(async () => { const r = await toggleLike(postId); if (r.error) { setMsg(r.error); setLiked(was); setCount((c) => c + (was ? 1 : -1)); } });
  };
  const share = async () => {
    const url = `${window.location.origin}/articles/${postId}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else { await navigator.clipboard.writeText(url); setMsg("Link copied."); }
    } catch { /* cancelled */ }
  };
  const send = async () => {
    if (!text.trim()) return;
    const r = await addComment(postId, text.trim());
    if (r.error) { setMsg(r.error); return; }
    setText(""); setMsg(""); setN(n + 1); await load();
  };
  const sendReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    const r = await addComment(postId, replyText.trim(), parentId);
    if (r.error) { setMsg(r.error); return; }
    setReplyText(""); setReplyTo(null); setMsg(""); setN(n + 1); await load();
  };
  const doRepost = () => start(async () => {
    const r = await repost(postId, repostNote);
    if (r.error) { setMsg(r.error); return; }
    if (!reposted) setRepostCount((c) => c + 1);
    setReposted(true); setComposing(false); setMsg("");
  });
  const doUndo = () => start(async () => {
    const r = await undoRepost(postId);
    if (r.error) { setMsg(r.error); return; }
    setReposted(false); setRepostCount((c) => Math.max(0, c - 1)); setRepostNote(""); setMsg("");
  });
  const toggleSaved = () => start(async () => {
    const prev = saved;
    setSaved(!prev);
    const r = await toggleSave(postId);
    if (r.error) { setSaved(prev); setMsg(r.error); return; }
  });
  const remove = (id: string) => start(async () => {
    const r = await deleteComment(id);
    if (r.error) { setMsg(r.error); return; }
    setList((l) => (l ?? []).filter((c) => c.id !== id)); setN((x) => Math.max(0, x - 1)); setMsg("");
  });

  const roots = (list ?? []).filter((c) => !c.parent_id);
  const repliesOf = (id: string) => (list ?? []).filter((c) => c.parent_id === id);
  const b = "flex items-center gap-2 text-slate7 hover:text-slate9";
  return (
    <div>
      <div className="flex items-center gap-6 text-sm font-bold">
        <button onClick={like} aria-pressed={liked} className={b}>
          <Heart size={20} fill={liked ? "#D9A15F" : "none"} stroke={liked ? "#D9A15F" : "currentColor"} /> {count}
        </button>
        <button onClick={toggle} aria-expanded={open} className={b}><MessageCircle size={20} /> {n}</button>
        <button onClick={() => (reposted ? doUndo() : setComposing(!composing))} aria-pressed={reposted} className={reposted ? "flex items-center gap-2 text-gold" : b}>
          <Repeat2 size={20} /> {repostCount}
        </button>
        <button onClick={share} className={`${b} ml-auto`}><Share2 size={20} /> Share</button>
        <button onClick={toggleSaved} aria-pressed={saved} aria-label={saved ? "Remove from Library" : "Save to Library"} className={saved ? "text-gold" : b}>
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        </button>
        {reportable && <ReportButton targetType="post" targetId={postId} className="font-normal text-slate7 underline hover:text-slate9" />}
      </div>
      {composing && !reposted && (
        <div className="mt-3 border-2 border-slate9 p-3">
          <textarea value={repostNote} onChange={(e) => setRepostNote(e.target.value)} rows={2} maxLength={280} dir="auto"
            placeholder="Add a short note (optional)" className="w-full bg-transparent text-base outline-none" />
          <div className="mt-2 flex gap-3">
            <button onClick={doRepost} className="bg-slate9 px-4 py-2 text-sm font-bold text-paper hover:bg-gold hover:text-night">Repost</button>
            <button onClick={() => setComposing(false)} className="text-sm underline">Cancel</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm text-slate7">{msg}</p>}
      {open && (
        <div className="mt-5">
          <ul className="mb-4 space-y-4">
            {roots.map((c) => (
              <li key={c.id} className="border-l-2 border-gold pl-3 text-base">
                <Link href={`/u/${c.profiles?.username ?? c.user_id}`} className="font-bold hover:underline">{c.profiles?.full_name ?? "Student"}</Link>{" "}
                <span className="text-xs text-slate5">{new Date(c.created_at).toLocaleDateString()}</span>
                <p dir="auto" className="whitespace-pre-wrap">{c.content}</p>
                <span className="mt-1 flex gap-4 text-xs">
                  {me && <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }} className="underline">Reply</button>}
                  {me && (me.id === c.user_id || me.staff) && <button onClick={() => remove(c.id)} className="text-danger underline">Delete</button>}
                  {me?.id !== c.user_id && <ReportButton targetType="comment" targetId={c.id} className="text-slate5 underline hover:text-slate9" />}
                </span>
                {replyTo === c.id && (
                  <div className="mt-2">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Write a reply" maxLength={1000} dir="auto" className="w-full border-2 border-slate9 bg-transparent p-2 text-base" />
                    <div className="mt-1 flex gap-3">
                      <button onClick={() => sendReply(c.id)} className="bg-slate9 px-3 py-1 text-sm font-bold text-paper">Reply</button>
                      <button onClick={() => setReplyTo(null)} className="text-sm underline">Cancel</button>
                    </div>
                  </div>
                )}
                {repliesOf(c.id).length > 0 && (
                  <ul className="ml-4 mt-3 space-y-3 border-l-2 border-slate3 pl-3">
                    {repliesOf(c.id).map((r) => (
                      <li key={r.id}>
                        <Link href={`/u/${r.profiles?.username ?? r.user_id}`} className="font-bold hover:underline">{r.profiles?.full_name ?? "Student"}</Link>{" "}
                        <span className="text-xs text-slate5">{new Date(r.created_at).toLocaleDateString()}</span>
                        <p dir="auto" className="whitespace-pre-wrap">{r.content}</p>
                        <span className="mt-1 flex gap-4 text-xs">
                          {me && (me.id === r.user_id || me.staff) && <button onClick={() => remove(r.id)} className="text-danger underline">Delete</button>}
                          {me?.id !== r.user_id && <ReportButton targetType="comment" targetId={r.id} className="text-slate5 underline hover:text-slate9" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {list !== null && list.length === 0 && <li className="text-base text-slate5">No comments yet. Start the discussion.</li>}
          </ul>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Add a comment" maxLength={1000} dir="auto"
            className="w-full border-2 border-slate9 bg-transparent p-2 text-base" />
          <button onClick={send} className="mt-2 bg-slate9 px-4 py-2 text-sm font-bold text-paper hover:bg-gold hover:text-night">Post comment</button>
        </div>
      )}
    </div>
  );
}
