"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";
import SearchBar from "./SearchBar";
import PostRow from "./PostRow";

const PAGE = 6;
type Row = { post: Post; likes: number; liked: boolean; comments: number };

export default function ArticlesFeed({ initialTag }: { initialTag: string | null }) {
  const [cat, setCat] = useState<string | null>(initialTag);
  const [cats, setCats] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (p: number, c: string | null, reset: boolean) => {
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    let q = sb.from("posts").select("*, profiles(username, full_name, avatar_url)").eq("status", "published").neq("post_type", "audio")
      .order("created_at", { ascending: false }).range(p * PAGE, p * PAGE + PAGE - 1);
    if (c) q = q.contains("tags", [c]);
    const { data: posts } = await q;
    const ids = (posts ?? []).map((x) => x.id);
    const [{ data: stats }, { data: mine }] = await Promise.all([
      sb.from("post_stats").select("*").in("post_id", ids),
      user ? sb.from("likes").select("post_id").eq("user_id", user.id).in("post_id", ids) : Promise.resolve({ data: [] as { post_id: string }[] }),
    ]);
    const next = (posts ?? []).map((post) => ({
      post: post as Post,
      likes: Number(stats?.find((s) => s.post_id === post.id)?.like_count ?? 0),
      comments: Number(stats?.find((s) => s.post_id === post.id)?.comment_count ?? 0),
      liked: !!mine?.some((l) => l.post_id === post.id),
    }));
    setRows((r) => (reset ? next : [...r, ...next]));
    setDone(next.length < PAGE);
    setLoading(false);
  }, []);

  useEffect(() => {
    createClient().from("posts").select("tags").eq("status", "published").neq("post_type", "audio").then(({ data }) => {
      const count = new Map<string, number>();
      (data ?? []).forEach((d) => ((d.tags as string[] | null) ?? []).forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
      setCats([...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t));
    });
  }, []);
  useEffect(() => { setPage(0); setDone(false); load(0, cat, true); }, [cat, load]);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading && !done) { const n = page + 1; setPage(n); load(n, cat, false); }
    }, { rootMargin: "300px" });
    io.observe(el); return () => io.disconnect();
  }, [loading, done, page, cat, load]);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <div className="mb-10 max-w-md"><SearchBar tone="light" /></div>
      <h1 className="font-serif text-5xl font-normal tracking-tight md:text-6xl">{cat ? <span className="capitalize">{cat}</span> : "Articles"}</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setCat(null)} aria-pressed={!cat}
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${!cat ? "border-slate9 bg-slate9 text-paper" : "border-slate3 hover:border-slate7"}`}>All</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold capitalize ${cat === c ? "border-slate9 bg-slate9 text-paper" : "border-slate3 hover:border-slate7"}`}>{c}</button>
        ))}
      </div>
      <div className="mt-10">
        {rows.map((r) => <PostRow key={r.post.id} {...r} />)}
      </div>
      {!loading && rows.length === 0 && <p className="mt-8 text-xl text-slate7">Nothing published here yet.</p>}
      <div ref={sentinel} className="h-10 text-slate5">{loading ? "Loading…" : done && rows.length ? "You have reached the end." : ""}</div>
    </div>
  );
}
