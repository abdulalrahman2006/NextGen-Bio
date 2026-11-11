import Link from "next/link";
import Hero from "@/components/Hero";
import PostRow from "@/components/PostRow";
import { getProfile } from "@/lib/supabase/server";
import { mergeSettings, pick } from "@/lib/defaults";
import type { Post } from "@/lib/types";

export const revalidate = 0;
type Stat = { post_id: string; like_count: number; comment_count: number };

export default async function Home() {
  const { supabase, user } = await getProfile();
  const [{ data: settingsRows }, { data: posts }, { data: tagRows }, { data: episodes }] = await Promise.all([
    supabase.from("site_settings").select("id, section_name, content_json"),
    supabase.from("posts").select("*, profiles(username, full_name, avatar_url)").eq("status", "published").neq("post_type", "audio").order("created_at", { ascending: false }).limit(6),
    supabase.from("posts").select("tags").eq("status", "published").neq("post_type", "audio"),
    supabase.from("posts").select("id,title,metadata").eq("status", "published").eq("post_type", "audio").order("created_at", { ascending: false }).limit(1),
  ]);
  const s = mergeSettings((settingsRows ?? []) as never);
  const hero = pick(s, "hero"), intro = pick(s, "intro");
  const list = (posts ?? []) as Post[];
  const ids = list.map((p) => p.id);
  const stats = (ids.length ? (await supabase.from("post_stats").select("*").in("post_id", ids)).data : []) as Stat[] | null;
  const mine = (user && ids.length ? (await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", ids)).data : []) as { post_id: string }[] | null;

  const count = new Map<string, number>();
  (tagRows ?? []).forEach((r) => ((r.tags as string[] | null) ?? []).forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
  const topics = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  const ep = episodes?.[0];
  const guest = ep ? String(((ep.metadata ?? {}) as Record<string, unknown>).guest ?? "") : "";

  return (
    <>
      <div className="surface-dark bleed bg-slate9 text-paper">
        <Hero compact line1={hero.line1} line2={hero.line2} intro={intro.text}>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/articles" className="bg-gold px-6 py-3 font-black text-night hover:bg-paper">Start reading</Link>
            <Link href="/create" className="border-2 border-paper px-6 py-3 font-black hover:bg-paper hover:text-slate9">Write for us</Link>
          </div>
        </Hero>
      </div>

      <div className="max-w-6xl gap-16 py-16 pr-6 lg:grid lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-2 text-xl font-black">Latest</h2>
          <div className="border-t border-slate3">
            {list.map((p) => (
              <PostRow key={p.id} post={p}
                likes={Number(stats?.find((x) => x.post_id === p.id)?.like_count ?? 0)}
                comments={Number(stats?.find((x) => x.post_id === p.id)?.comment_count ?? 0)}
                liked={!!mine?.some((l) => l.post_id === p.id)} />
            ))}
          </div>
          {list.length === 0 && <p className="mt-6 text-xl text-slate7">Nothing published yet. Be the first to <Link href="/create" className="font-bold underline">write something</Link>.</p>}
          {list.length > 0 && <Link href="/articles" className="mt-8 inline-block font-bold underline">See all articles</Link>}
        </section>

        <aside className="mt-16 space-y-12 lg:mt-0">
          {topics.length > 0 && (
            <div>
              <h2 className="mb-3 font-black">Topics</h2>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => <Link key={t} href={`/articles?tag=${encodeURIComponent(t)}`} className="bg-slate3/50 px-3 py-1 text-sm capitalize hover:bg-slate3">{t}</Link>)}
              </div>
            </div>
          )}
          {ep && (
            <div>
              <h2 className="mb-3 font-black">Latest episode</h2>
              <Link href={`/podcast?ep=${ep.id}`} className="surface-dark block bg-slate9 p-5 text-paper hover:bg-slate7">
                <span className="block text-xl font-black leading-tight">{ep.title}</span>
                {guest && <span className="mt-1 block text-sm text-slate3">with {guest}</span>}
                <span className="mt-4 block text-sm font-bold text-gold">Listen on the podcast page</span>
              </Link>
            </div>
          )}
          <div>
            <h2 className="mb-3 font-black">Write for NextGen Bio</h2>
            <p className="text-slate7">Share your research, a protocol or a dataset. Editors review every post before it goes live.</p>
            <Link href="/create" className="mt-3 inline-block font-bold underline">Start writing</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
