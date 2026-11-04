import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { dismissNotifications } from "@/app/actions/review";

export const revalidate = 0;

type Row = { id: string; title: string; post_type: string; status: string; created_at: string; review_note?: string | null };
const labelOf = (p: Row) =>
  p.status === "draft" ? (p.review_note ? "Needs changes" : "Draft") : p.status === "pending" ? "Waiting for review" : "Published";

export default async function MyPosts({ searchParams }: { searchParams: { submitted?: string; saved?: string } }) {
  const { supabase, user } = await getProfile();
  if (!user) redirect("/login?next=/my-posts");
  const [{ data: posts }, { data: notes }] = await Promise.all([
    supabase.from("posts").select("*").eq("author_id", user.id).order("created_at", { ascending: false }),
    supabase.from("notifications").select("id,kind,message,post_id").eq("user_id", user.id).is("read_at", null).order("created_at", { ascending: false }),
  ]);
  const rows = (posts ?? []) as Row[];
  return (
    <section className="max-w-3xl pb-24 pr-6 pt-28">
      <h1 className="mb-8 text-4xl font-black tracking-tight md:text-6xl">My posts</h1>
      {searchParams.submitted && <p role="status" className="mb-6 border-2 border-slate9 p-4 font-bold">Submitted. An editor will review it soon.</p>}
      {searchParams.saved && <p role="status" className="mb-6 border-2 border-slate9 p-4 font-bold">Saved. An editor will review your changes.</p>}
      {(notes ?? []).length > 0 && (
        <div className="mb-8 border-2 border-gold p-4">
          <h2 className="font-black">New updates</h2>
          <ul className="mt-2 space-y-1">
            {(notes ?? []).map((n) => (
              <li key={n.id}><Link href={n.kind === "published" ? `/articles/${n.post_id}` : `/edit/${n.post_id}`} className="underline" dir="auto">{n.message}</Link></li>
            ))}
          </ul>
          <form action={dismissNotifications}><button className="mt-3 text-sm underline">Dismiss</button></form>
        </div>
      )}
      {rows.length === 0 && <p className="text-xl text-slate7">You have not written anything yet. <Link href="/create" className="font-bold underline">Write your first post</Link>.</p>}
      <ul>
        {rows.map((p) => (
          <li key={p.id} className="border-t border-slate3 py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="min-w-0 flex-1 text-xl font-black" dir="auto">{p.title}</span>
              <span className={`text-sm ${labelOf(p) === "Needs changes" ? "font-bold text-danger" : "text-slate7"}`}>{p.post_type === "audio" ? "podcast" : p.post_type} · {labelOf(p)}</span>
              {p.status === "pending" ? <span className="font-bold text-slate7">Under review</span> : <Link href={`/edit/${p.id}`} className="font-bold underline">{p.status === "draft" ? "Continue writing" : "Edit"}</Link>}
              {p.status !== "draft" && <Link href={p.post_type === "audio" ? `/podcast?ep=${p.id}` : `/articles/${p.id}`} className="underline">View</Link>}
            </div>
            {p.status === "draft" && p.review_note && (
              <p className="mt-2 border-l-4 border-gold pl-3 text-slate7" dir="auto"><b>Editor&apos;s note:</b> {p.review_note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
