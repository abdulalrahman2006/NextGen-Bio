import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";

export default async function Library() {
  const { supabase, user } = await getProfile();
  if (!user) redirect("/login?next=/library");

  const { data: saves } = await supabase.from("saves")
    .select("created_at, posts!inner(id,title,post_type,status,created_at,profiles(full_name))")
    .eq("user_id", user.id).eq("posts.status", "published").order("created_at", { ascending: false });

  const rows = (saves ?? []).map((s) => ({
    savedAt: s.created_at,
    post: s.posts as unknown as { id: string; title: string; post_type: string; profiles: { full_name: string | null } | null },
  }));

  return (
    <section className="max-w-3xl pb-24 pr-6 pt-32">
      <h1 className="text-5xl font-black tracking-tight md:text-6xl">Your library</h1>
      <p className="mt-3 text-slate7">Articles and episodes you've saved for later. Only you can see this.</p>
      <div className="mt-10">
        {rows.map(({ post }) => (
          <article key={post.id} className="border-t border-slate3 py-6 first:border-t-0">
            <p className="mb-1 text-sm text-slate5">{post.post_type === "audio" ? "Podcast" : "Article"} · {post.profiles?.full_name ?? "Anonymous"}</p>
            <h2 dir="auto" className="font-serif text-2xl font-normal leading-tight tracking-tight">
              <Link href={post.post_type === "audio" ? `/podcast?ep=${post.id}` : `/articles/${post.id}`} className="hover:text-slate7">{post.title}</Link>
            </h2>
          </article>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="mt-8 text-xl text-slate7">Nothing saved yet. Tap the bookmark icon on any article to add it here.</p>
      )}
    </section>
  );
}
