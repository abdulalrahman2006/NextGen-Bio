import Link from "next/link";
import Avatar from "./Avatar";
import PostActions from "./PostActions";
import { firstImage, plain, readMinutes } from "@/lib/text";
import type { Post } from "@/lib/types";

export default function PostRow({ post, likes, liked, comments }: { post: Post; likes: number; liked: boolean; comments: number }) {
  const img = firstImage(post.content);
  const href = `/articles/${post.id}`;
  const topic = post.tags?.[0];
  return (
    <article className="border-t border-slate3 py-9 first:border-t-0">
      <div className="grid gap-8 sm:grid-cols-[1fr_200px]">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate5">
            {topic && <span className="capitalize">{topic} · </span>}{readMinutes(post.content)} min read
          </p>
          <h2 dir="auto" className="font-serif text-2xl font-normal leading-tight tracking-tight md:text-[28px]">
            <Link href={href} className="hover:text-slate7">{post.title}</Link>
          </h2>
          <p dir="auto" className="mt-3 max-w-[62ch] text-base leading-relaxed text-slate7">{plain(post.content, 180)}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate5">
            <Avatar url={post.profiles?.avatar_url} name={post.profiles?.full_name} size={22} />
            <Link href={`/u/${post.author_id}`} className="font-bold text-slate7 hover:underline">{post.profiles?.full_name ?? "Anonymous"}</Link>
            <span>· {new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        {img && (
          <Link href={href} className="hidden shrink-0 sm:block" aria-hidden tabIndex={-1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" loading="lazy" className="h-[134px] w-full border border-slate3 object-cover" />
          </Link>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(post.tags ?? []).slice(0, 3).map((t) => (
          <Link key={t} href={`/articles?tag=${encodeURIComponent(t)}`} className="rounded-full border border-slate3 px-3 py-1 text-xs font-bold capitalize hover:border-slate7">{t}</Link>
        ))}
      </div>
      <div className="mt-4"><PostActions postId={post.id} likes={likes} liked={liked} comments={comments} reportable /></div>
    </article>
  );
}
