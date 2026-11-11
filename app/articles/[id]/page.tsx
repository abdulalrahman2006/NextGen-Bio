import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import Markdown from "@/components/Markdown";
import PostActions from "@/components/PostActions";
import DeletePostButton from "@/components/DeletePostButton";
import { createClient, getProfile } from "@/lib/supabase/server";
import { firstImage, plain, readMinutes } from "@/lib/text";

export const revalidate = 0;

// What shows when the link is shared in WhatsApp, Telegram and similar apps. Only published posts get a preview.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: post } = await createClient().from("posts").select("id,title,content,status,metadata").eq("id", params.id).maybeSingle();
  if (!post || post.status !== "published") return {};
  const description = plain(post.content, 160);
  const cover = ((post.metadata ?? {}) as Record<string, unknown>).cover_url;
  const image = firstImage(post.content) ?? (typeof cover === "string" && cover ? cover : "/opengraph-image");
  return {
    title: post.title, description,
    openGraph: { type: "article", title: post.title, description, images: [image] },
    twitter: { card: "summary_large_image", title: post.title, description, images: [image] },
  };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { supabase, user } = await getProfile();
  const { data: post } = await supabase.from("posts").select("*, profiles(username, full_name, avatar_url)").eq("id", params.id).maybeSingle();
  if (!post) notFound();
  if (post.post_type === "audio") redirect(`/podcast?ep=${post.id}`);
  const { data: stat } = await supabase.from("post_stats").select("like_count, comment_count, repost_count").eq("post_id", post.id).maybeSingle();
  const { data: mine } = user ? await supabase.from("likes").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle() : { data: null };
  const { data: myRepost } = user ? await supabase.from("reposts").select("note").eq("post_id", post.id).eq("user_id", user.id).maybeSingle() : { data: null };
  const { data: mySave } = user ? await supabase.from("saves").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle() : { data: null };
  return (
    <article className="max-w-[680px] pb-24 pr-6 pt-32">
      <Link href="/articles" className="text-sm text-slate7 underline">All articles</Link>
      {post.status !== "published" && (
        <p className="mt-6 flex flex-wrap items-center gap-3 border-2 border-slate9 p-3 font-bold">
          <span>{post.status === "pending" ? "Under review. Only you and the editors can see this." : "Draft. Only you and the editors can see this."}</span>
          {user?.id === post.author_id && (
            <>
              <Link href={`/edit/${post.id}`} className="underline">Edit</Link>
              <DeletePostButton id={post.id} redirectTo="/my-posts" />
            </>
          )}
        </p>
      )}
      <h1 dir="auto" className="mt-6 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">{post.title}</h1>
      <Link href={`/u/${post.profiles?.username ?? post.author_id}`} className="mt-8 flex items-center gap-3">
        <Avatar url={post.profiles?.avatar_url} name={post.profiles?.full_name} size={48} />
        <span>
          <span className="block font-bold">{post.profiles?.full_name ?? "Anonymous"}</span>
          <span className="text-sm text-slate5">{readMinutes(post.content)} min read · {new Date(post.created_at).toLocaleDateString()}</span>
        </span>
      </Link>
      <div className="reading mt-12"><Markdown>{post.content}</Markdown></div>
      {(post.tags ?? []).length > 0 && (
        <p className="mt-12 flex flex-wrap gap-2">
          {(post.tags as string[]).map((t) => <Link key={t} href={`/articles?tag=${encodeURIComponent(t)}`} className="bg-slate3/50 px-3 py-1 text-sm capitalize hover:bg-slate3">{t}</Link>)}
        </p>
      )}
      <div className="mt-8 border-t border-slate3 pt-6">
        <PostActions postId={post.id} likes={Number(stat?.like_count ?? 0)} comments={Number(stat?.comment_count ?? 0)}
          reposts={Number(stat?.repost_count ?? 0)} reposted={!!myRepost} repostNote={myRepost?.note ?? ""} saved={!!mySave} liked={!!mine} defaultOpen reportable />
      </div>
      {post.status === "published" && user?.id === post.author_id && (
        <p className="mt-6"><DeletePostButton id={post.id} redirectTo="/my-posts" warnLive /></p>
      )}
    </article>
  );
}
