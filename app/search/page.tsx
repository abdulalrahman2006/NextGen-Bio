import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import Avatar from "@/components/Avatar";
import { plain } from "@/lib/text";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type Hit = { id: string; title: string; category: string; content: string; post_type: string; created_at: string; metadata: Record<string, unknown>; profiles: { full_name: string | null } | null };
type PersonHit = { id: string; full_name: string | null; headline: string | null; avatar_url: string | null };

function excerpt(raw: string, q: string) {
  const text = plain(raw, 100000);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, 160) + (text.length > 160 ? "…" : "");
  const a = Math.max(0, i - 70);
  return (a > 0 ? "…" : "") + text.slice(a, i + q.length + 90) + "…";
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const clean = q.replace(/[,()%*{}\\"]/g, " ").trim();
  let written: Hit[] = [], audio: Hit[] = [], people: PersonHit[] = [];
  if (clean) {
    const sb = createClient();
    const filter = `title.ilike.%${clean}%,content.ilike.%${clean}%,category.ilike.%${clean}%,tags.cs.{${clean.toLowerCase()}},metadata->>guest.ilike.%${clean}%,metadata->>transcript.ilike.%${clean}%`;
    const base = () => sb.from("posts").select("id,title,category,content,post_type,created_at,metadata,profiles(full_name)")
      .eq("status", "published").or(filter).order("created_at", { ascending: false }).limit(20);
    const peopleFilter = `full_name.ilike.%${clean}%,headline.ilike.%${clean}%`;
    const [a, b, p] = await Promise.all([
      base().neq("post_type", "audio"),
      base().eq("post_type", "audio"),
      sb.from("profiles").select("id,full_name,headline,avatar_url").or(peopleFilter).order("full_name").limit(12),
    ]);
    written = (a.data ?? []) as unknown as Hit[]; audio = (b.data ?? []) as unknown as Hit[];
    people = (p.data ?? []) as unknown as PersonHit[];
  }
  const Row = ({ h, href }: { h: Hit; href: string }) => (
    <li className="border-t border-slate3 py-6">
      <p className="text-sm text-slate5">{h.category} · {h.post_type === "audio" ? "podcast" : h.post_type} · {new Date(h.created_at).toLocaleDateString()}</p>
      <Link href={href} dir="auto" className="block font-black text-3xl md:text-4xl tracking-tight leading-none mt-2 hover:underline">{h.title}</Link>
      <p dir="auto" className="mt-3 max-w-2xl text-slate7">{(() => { const t = String(h.metadata?.transcript ?? ""); const q = clean.toLowerCase(); return t && t.toLowerCase().includes(q) && !h.content.toLowerCase().includes(q) && !h.title.toLowerCase().includes(q) ? <><span className="font-bold">In the transcript: </span>{excerpt(t, clean)}</> : excerpt(h.content, clean); })()}</p>
    </li>
  );
  return (
    <div className="pt-32 pr-6 pb-24">
      <h1 className="mb-8 text-5xl font-black tracking-tight md:text-6xl">Search</h1>
      <div className="max-w-2xl mb-14"><SearchBar tone="light" defaultValue={q} autoFocus={!q} /></div>
      {!clean && <p className="text-xl text-slate7">Type a word to search every published article, idea and podcast episode.</p>}
      {clean && written.length + audio.length + people.length === 0 && (
        <p className="text-xl text-slate7">Nothing matched “{q}”. Try a shorter word or a different spelling.</p>
      )}
      {people.length > 0 && (
        <section className="max-w-4xl mb-16">
          <h2 className="font-black text-2xl mb-2">People ({people.length})</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {people.map((pr) => (
              <li key={pr.id}><Link href={`/u/${pr.id}`} className="flex items-center gap-3 border-t border-slate3 py-4 hover:underline">
                <Avatar url={pr.avatar_url} name={pr.full_name} size={44} />
                <span><span dir="auto" className="block font-bold">{pr.full_name ?? "Unnamed"}</span>{pr.headline && <span dir="auto" className="block text-sm text-slate5">{pr.headline}</span>}</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
      {written.length > 0 && (
        <section className="max-w-4xl mb-16">
          <h2 className="font-black text-2xl mb-2">Articles ({written.length})</h2>
          <ul>{written.map((h) => <Row key={h.id} h={h} href={`/articles/${h.id}`} />)}</ul>
        </section>
      )}
      {audio.length > 0 && (
        <section className="max-w-4xl">
          <h2 className="font-black text-2xl mb-2">Podcast episodes ({audio.length})</h2>
          <ul>{audio.map((h) => <Row key={h.id} h={h} href={`/podcast?ep=${h.id}`} />)}</ul>
        </section>
      )}
    </div>
  );
}
