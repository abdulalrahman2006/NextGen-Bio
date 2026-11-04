import Link from "next/link";
import { Chapter, MetaGrid } from "@/components/CaseStudy";
import { createClient } from "@/lib/supabase/server";
import { mergeSettings, pick } from "@/lib/defaults";

export const revalidate = 0;

export default async function About() {
  const { data } = await createClient().from("site_settings").select("id, section_name, content_json");
  const s = mergeSettings((data ?? []) as never);
  const a = pick(s, "about"), meta = pick(s, "meta");
  return (
    <div className="dark-page pr-6 pb-8">
      <section className="min-h-[80vh] flex flex-col justify-end pb-14 pt-32">
        <h1 className="brut text-[10vw]">{a.title}</h1>
        <p className="mt-8 max-w-xl text-lg text-slate3">{a.intro}</p>
      </section>
      <MetaGrid items={[["Formats", meta.format], ["Audience", meta.audience], ["Review", meta.review]]} />
      <div className="pt-16 max-w-5xl">
        <Chapter id="what" n={1} label="Mission" title={a.mission_title}><p>{a.mission_text}</p></Chapter>
        <Chapter id="who" n={2} label="Audience" title={a.who_title}><p>{a.who_text}</p></Chapter>
        <section className="border-t border-slate7 pt-8 pb-28">
          <p className="text-sm text-slate5 mb-6">03 / Contribute</p>
          <Link href="/create" className="brut text-[9vw] hover:text-gold transition-colors block">{a.join_title}</Link>
          <p className="mt-6 text-lg text-slate3 max-w-xl">{a.join_text}</p>
        </section>
      </div>
    </div>
  );
}
