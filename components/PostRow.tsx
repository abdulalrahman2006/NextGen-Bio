import Link from "next/link";
import Avatar from "./Avatar";
import PostActions from "./PostActions";
import { firstImage, plain, readMinutes } from "@/lib/text";
import type { Post } from "@/lib/types";

export default function PostRow({ post, likes, liked, comments }: { post: Post; likes: number; liked: boolean; comments: number }) {
  const img = firstImage(post.content);
  const href = `/articles/${post.id}`;
  return (
    <article className="border-b border-slate3 py-8">
      <div className="flex items-center gap-2 text-sm">
        <Avatar url={post.profiles?.avatar_url} name={post.profiles?.full_name} size={24} />
        <Link href={`/u/${post.author_id}`} className="font-bold hover:underline">{post.profiles?.full_name ?? "Anonymous"}</Link>
        <span className="text-slate5">· {new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      <div className="mt-3 flex gap-6">
        <div className="min-w-0 flex-1">
          <h2 dir="auto" className="text-2xl font-black leading-tight tracking-tight md:text-3xl"><Link href={href} className="hover:text-slate7">{post.title}</Link></h2>
          <p dir="auto" className="mt-2 text-slate7">{plain(post.content, 180)}</p>
        </div>
        {img && (
          <Link href={href} className="hidden shrink-0 sm:block" aria-hidden tabIndex={-1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" loading="lazy" className="h-28 w-40 object-cover" />
          </Link>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(post.tags ?? []).slice(0, 3).map((t) => (
          <Link key={t} href={`/articles?tag=${encodeURIComponent(t)}`} className="bg-slate3/50 px-3 py-1 text-sm capitalize hover:bg-slate3">{t}</Link>
        ))}
        <span className="text-sm text-slate5">{readMinutes(post.content)} min read</span>
      </div>
      <div className="mt-4"><PostActions postId={post.id} likes={likes} liked={liked} comments={comments} reportable /></div>
    </article>
  );
}
