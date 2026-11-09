import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Repeat2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import ReportButton from "@/components/ReportButton";
import FollowButton from "@/components/FollowButton";
import { createClient, getProfile } from "@/lib/supabase/server";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: p } = await createClient().from("profiles").select("full_name,headline,bio,avatar_url").eq("id", params.id).maybeSingle();
  if (!p) return {};
  const name = p.full_name ?? "Student";
  const description = p.headline || (p.bio ? String(p.bio).slice(0, 160) : "A writer on NextGen Bio.");
  const image = p.avatar_url || "/opengraph-image";
  return { title: name, description, openGraph: { title: name, description, images: [image] }, twitter: { card: "summary", title: name, description, images: [image] } };
}

export default async function PublicProfile({ params }: { params: { id: string } }) {
  const { supabase, user } = await getProfile();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).maybeSingle();
  if (!p) notFound();
  const { data: posts } = await supabase.from("posts").select("id,title,post_type,created_at,tags")
    .eq("author_id", params.id).eq("status", "published").order("created_at", { ascending: false });
  const [{ count: followers }, { count: following }, { data: myFollow }, { data: reposts }] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", params.id),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", params.id),
    user ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("followee_id", params.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("reposts").select("id,note,created_at,posts!inner(id,title,post_type,status,author_id,profiles(full_name))")
      .eq("user_id", params.id).eq("posts.status", "published").order("created_at", { ascending: false }),
  ]);
  const me = user?.id === p.id;
  type FeedItem =
    | { kind: "post"; created_at: string; id: string; title: string; post_type: string }
    | { kind: "repost"; created_at: string; note: string | null; original: { id: string; title: string; post_type: string; author_name: string | null } };
  const feed: FeedItem[] = [
    ...(posts ?? []).map((x): FeedItem => ({ kind: "post", created_at: x.created_at, id: x.id, title: x.title, post_type: x.post_type })),
    ...(reposts ?? []).map((r): FeedItem => {
      const rp = r.posts as unknown as { id: string; title: string; post_type: string; profiles: { full_name: string | null } | null };
      return { kind: "repost", created_at: r.created_at, note: r.note, original: { id: rp.id, title: rp.title, post_type: rp.post_type, author_name: rp.profiles?.full_name ?? null } };
    }),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return (
    <div className="pt-32 pr-6 pb-24">
      <div className="flex flex-wrap items-center gap-6">
        <Avatar url={p.avatar_url} name={p.full_name} size={112} />
        <div>
          <h1 dir="auto" className="text-4xl font-black tracking-tight md:text-6xl">{p.full_name ?? "Student"}</h1>
          {p.headline && <p dir="auto" className="mt-3 text-xl text-slate7">{p.headline}</p>}
          {["admin", "editor"].includes(p.role) && <p className="mt-2 text-sm font-bold text-slate7">{p.role === "admin" ? "Admin" : "Editor"}</p>}
          <p className="mt-2 text-sm text-slate7">{followers ?? 0} followers · {following ?? 0} following</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {user && !me && <FollowButton userId={p.id} initialFollowing={!!myFollow} initialCount={followers ?? 0} />}
            {!me && <ReportButton targetType="profile" targetId={p.id} label="Report this profile" />}
          </div>
        </div>
      </div>
      {p.bio && <p dir="auto" className="mt-8 max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-slate7">{p.bio}</p>}
      {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block underline hover:underline">{p.website.replace(/^https?:\/\//, "")}</a>}
      {me && (
        <p className="mt-8 flex gap-6 font-bold">
          <Link href="/settings" className="underline hover:underline">Edit profile</Link>
          <Link href="/my-posts" className="underline hover:underline">My posts</Link>
        </p>
      )}
      <h2 className="mt-16 mb-2 text-2xl font-black">Activity ({feed.length})</h2>
      <ul className="max-w-3xl">
        {feed.map((item) => item.kind === "post" ? (
          <li key={`post-${item.id}`} className="border-t border-slate3 py-5">
            <p className="text-sm text-slate5">{item.post_type === "audio" ? "podcast" : item.post_type} · {new Date(item.created_at).toLocaleDateString()}</p>
            <Link href={item.post_type === "audio" ? `/podcast?ep=${item.id}` : `/articles/${item.id}`} dir="auto" className="mt-1 block text-3xl font-black leading-none tracking-tight hover:underline">{item.title}</Link>
          </li>
        ) : (
          <li key={`repost-${item.original.id}-${item.created_at}`} className="border-t border-slate3 py-5">
            <p className="flex items-center gap-2 text-sm text-slate5"><Repeat2 size={16} /> Reposted · {new Date(item.created_at).toLocaleDateString()}</p>
            {item.note && <p dir="auto" className="mt-2 text-lg">{item.note}</p>}
            <div className="mt-2 border-l-2 border-slate3 pl-3">
              <p className="text-sm text-slate5">by {item.original.author_name ?? "Student"}</p>
              <Link href={item.original.post_type === "audio" ? `/podcast?ep=${item.original.id}` : `/articles/${item.original.id}`} dir="auto" className="mt-1 block text-xl font-black leading-tight tracking-tight hover:underline">{item.original.title}</Link>
            </div>
          </li>
        ))}
      </ul>
      {feed.length === 0 && <p className="text-slate7">Nothing here yet.</p>}
    </div>
  );
}
