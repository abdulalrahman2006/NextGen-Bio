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
    let q = sb.from("posts").select("*, profiles(full_name, avatar_url)").eq("status", "published").neq("post_type", "audio")
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
    <div className="max-w-6xl gap-16 pb-24 pr-6 pt-32 lg:grid lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="text-5xl font-black tracking-tight md:text-6xl">{cat ? <span className="capitalize">{cat}</span> : "Articles"}</h1>
        {cat && <button onClick={() => setCat(null)} className="mt-2 text-slate7 underline">Show all articles</button>}
        <div className="mt-6 border-t border-slate3">
          {rows.map((r) => <PostRow key={r.post.id} {...r} />)}
        </div>
        {!loading && rows.length === 0 && <p className="mt-8 text-xl text-slate7">Nothing published here yet.</p>}
        <div ref={sentinel} className="h-10 text-slate5">{loading ? "Loading…" : done && rows.length ? "You have reached the end." : ""}</div>
      </section>
      <aside className="mt-12 space-y-10 self-start lg:sticky lg:top-28 lg:mt-0">
        <SearchBar tone="light" />
        <div>
          <h2 className="mb-3 font-black">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`px-3 py-1 text-sm capitalize ${cat === c ? "bg-slate9 text-paper" : "bg-slate3/50 hover:bg-slate3"}`}>{c}</button>
            ))}
            {cats.length === 0 && <p className="text-sm text-slate5">Topics appear when posts have tags.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
