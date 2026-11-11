import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import { getProfile } from "@/lib/supabase/server";

export default async function Following() {
  const { supabase, user } = await getProfile();
  if (!user) redirect("/login?next=/following");

  const { data: follows } = await supabase.from("follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);

  const { data: posts } = ids.length
    ? await supabase.from("posts").select("id,title,post_type,created_at,profiles(id,username,full_name,avatar_url)")
      .in("author_id", ids).eq("status", "published").order("created_at", { ascending: false }).limit(50)
    : { data: [] };

  return (
    <section className="max-w-3xl pb-24 pr-6 pt-32">
      <h1 className="text-5xl font-black tracking-tight md:text-6xl">Following</h1>
      <p className="mt-3 text-slate7">New articles and episodes from the {ids.length} {ids.length === 1 ? "person" : "people"} you follow.</p>
      <div className="mt-10">
        {(posts ?? []).map((p) => {
          const author = p.profiles as unknown as { id: string; username: string; full_name: string | null; avatar_url: string | null } | null;
          return (
            <article key={p.id} className="border-t border-slate3 py-6 first:border-t-0">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate5">
                <Avatar url={author?.avatar_url} name={author?.full_name} size={20} />
                <Link href={`/u/${author?.username ?? author?.id}`} className="font-bold text-slate7 hover:underline">{author?.full_name ?? "Anonymous"}</Link>
                <span>· {new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              <h2 dir="auto" className="font-serif text-2xl font-normal leading-tight tracking-tight">
                <Link href={p.post_type === "audio" ? `/podcast?ep=${p.id}` : `/articles/${p.id}`} className="hover:text-slate7">{p.title}</Link>
              </h2>
            </article>
          );
        })}
      </div>
      {ids.length === 0 && (
        <p className="mt-8 text-xl text-slate7">You're not following anyone yet. Visit a profile and tap Follow to see their posts here.</p>
      )}
      {ids.length > 0 && (posts ?? []).length === 0 && (
        <p className="mt-8 text-xl text-slate7">No posts yet from people you follow.</p>
      )}
    </section>
  );
}
