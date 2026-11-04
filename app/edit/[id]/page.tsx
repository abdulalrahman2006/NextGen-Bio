import Link from "next/link";
import { redirect } from "next/navigation";
import PostForm from "@/components/PostForm";
import { getProfile } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const revalidate = 0;

export default async function EditPost({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const { supabase, user, profile } = await getProfile();
  if (!user) redirect(`/login?next=/edit/${params.id}`);
  const { data: post } = await supabase.from("posts").select("*").eq("id", params.id).maybeSingle();
  if (!post || post.author_id !== user.id) redirect("/my-posts");
  const p = post as Post;
  const isStaff = profile ? ["admin", "editor"].includes(profile.role) : false;
  if (p.status === "pending") {
    return (
      <section className="max-w-3xl pb-24 pr-6 pt-28">
        <h1 className="mb-8 text-4xl font-black tracking-tight md:text-6xl">Under review</h1>
        <p className="text-xl text-slate7">This post is waiting for an editor to review it, so you can&apos;t edit it right now. You&apos;ll get a notification when it&apos;s published or if changes are requested.</p>
        <Link href="/my-posts" className="mt-6 inline-block font-bold underline">Back to My posts</Link>
      </section>
    );
  }
  return (
    <section className="max-w-3xl pb-24 pr-6 pt-28">
      <h1 className="mb-8 text-4xl font-black tracking-tight md:text-6xl">{p.status === "draft" ? "Continue writing" : "Edit your post"}</h1>
      {searchParams.saved && <p role="status" className="mb-6 border-2 border-slate9 p-4 font-bold">Draft saved.</p>}
      {p.status === "draft" && p.review_note && (
        <div className="mb-8 border-2 border-gold p-4" dir="auto">
          <p className="font-black">An editor asked for changes</p>
          <p className="mt-1 whitespace-pre-wrap">{p.review_note}</p>
          <p className="mt-2 text-sm text-slate7">Make the changes below, then submit it for review again.</p>
        </div>
      )}
      <PostForm post={p} isStaff={isStaff} autoPublish={isStaff || !!profile?.trusted} />
    </section>
  );
}
