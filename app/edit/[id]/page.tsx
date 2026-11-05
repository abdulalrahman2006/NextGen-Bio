import Link from "next/link";
import { redirect } from "next/navigation";
import PostForm from "@/components/PostForm";
import DeletePostButton from "@/components/DeletePostButton";
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
  if (p.status === "published") {
    return (
      <section className="max-w-3xl pb-24 pr-6 pt-28">
        <h1 className="mb-8 text-4xl font-black tracking-tight md:text-6xl">Published</h1>
        <p className="text-xl text-slate7">Published posts can&apos;t be edited. If there&apos;s a problem with it, an editor will flag it or unpublish it and you&apos;ll be notified.</p>
        <Link href={p.post_type === "audio" ? `/podcast?ep=${p.id}` : `/articles/${p.id}`} className="mt-6 inline-block font-bold underline">View it</Link>
        <Link href="/my-posts" className="mt-6 ml-6 inline-block font-bold underline">Back to My posts</Link>
      </section>
    );
  }
  return (
    <section className="max-w-3xl pb-24 pr-6 pt-28">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">{p.status === "draft" ? "Continue writing" : "Edit your post"}</h1>
        <DeletePostButton id={p.id} redirectTo="/my-posts" />
      </div>
      {searchParams.saved && <p role="status" className="mb-6 border-2 border-slate9 p-4 font-bold">Draft saved.</p>}
      {p.status === "pending" && (
        <p className="mb-8 border-2 border-slate9 p-4 font-bold">This post is still under review. You can keep editing it or change your mind and pull it back to a draft.</p>
      )}
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
