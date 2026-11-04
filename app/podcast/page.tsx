import type { Metadata } from "next";
import PodcastClient from "@/components/PodcastClient";
import type { Episode } from "@/components/PodcastScene";
import { createClient } from "@/lib/supabase/server";
import { youtubeId } from "@/lib/youtube";
import { plain } from "@/lib/text";

export const revalidate = 0;

export async function generateMetadata({ searchParams }: { searchParams: { ep?: string } }): Promise<Metadata> {
  const base: Metadata = { title: "Podcast", description: "Listen to student and expert conversations on biotechnology." };
  const id = searchParams.ep;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return base;
  const { data: p } = await createClient().from("posts").select("id,title,content,status,metadata").eq("id", id).eq("post_type", "audio").maybeSingle();
  if (!p || p.status !== "published") return base;
  const m = (p.metadata ?? {}) as Record<string, unknown>;
  const yt = m.media_type === "youtube" && typeof m.media_url === "string" ? youtubeId(m.media_url) : null;
  const image = typeof m.cover_url === "string" && m.cover_url ? m.cover_url : yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : "/opengraph-image";
  const guest = typeof m.guest === "string" && m.guest ? `With ${m.guest}. ` : "";
  const description = `${guest}${plain(p.content, 140)}`.trim() || "A NextGen Bio podcast episode.";
  const title = `${p.title} (podcast)`;
  return { title, description, openGraph: { title, description, images: [image] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

// Shown only until the first audio post is published.
const SAMPLE: Episode[] = [
  { id: "s1", title: "Editing the genome", guest: "Dr. Amira Hassan", topic: "CRISPR", date: "2026-09-12", duration: "38:10", notes: ["00:00 Intro", "04:20 How Cas9 cuts", "19:45 Off-target effects", "31:00 Q&A"] },
  { id: "s2", title: "Cells as factories", guest: "Omar Khaled", topic: "Synthetic Bio", date: "2026-09-26", duration: "41:22", notes: ["00:00 Intro", "06:10 Chassis organisms", "22:30 Scale-up", "36:00 Q&A"] },
  { id: "s3", title: "Reading the variants", guest: "Dr. Salma Nabil", topic: "Genetics", date: "2026-10-10", duration: "35:48", notes: ["00:00 Intro", "05:00 Reading a VCF", "18:15 Pathogenicity", "30:40 Q&A"] },
];

export default async function Podcast({ searchParams }: { searchParams: { ep?: string } }) {
  const { data } = await createClient().from("posts").select("id,title,category,content,metadata,created_at,tags")
    .eq("post_type", "audio").eq("status", "published").order("created_at", { ascending: false });
  const fromDb: Episode[] = (data ?? []).map((p) => {
    const m = (p.metadata ?? {}) as Record<string, unknown>;
    const raw = m.media_url ?? m.audio_url;
    const url = typeof raw === "string" && /^https?:\/\//.test(raw) ? raw : undefined;
    const yt = m.media_type === "youtube" && typeof raw === "string" ? youtubeId(raw) : null;
    const cover = typeof m.cover_url === "string" && /^https?:\/\//.test(m.cover_url) ? m.cover_url : undefined;
    return {
      id: p.id, title: p.title, topic: String(p.category).replace(/^./, (c: string) => c.toUpperCase()),
      tags: Array.isArray(p.tags) ? p.tags.map(String) : undefined, date: String(p.created_at).slice(0, 10),
      guest: typeof m.guest === "string" && m.guest ? m.guest : "—",
      duration: typeof m.duration === "string" && /^\d+:\d{2}$/.test(m.duration) ? m.duration : "00:00",
      notes: Array.isArray(m.notes) && m.notes.length ? m.notes.map(String) : String(p.content).split("\n").filter(Boolean).slice(0, 6),
      mediaUrl: yt ? undefined : url, youtubeId: yt ?? undefined,
      transcript: typeof m.transcript === "string" && m.transcript ? m.transcript : undefined,
      mediaType: yt ? "youtube" : m.media_type === "video" ? "video" : "audio",
      thumbnailUrl: cover ?? (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : undefined),
    };
  });
  const episodes = fromDb.length ? fromDb : SAMPLE;
  const initial = Math.max(0, episodes.findIndex((e) => String(e.id) === searchParams.ep));
  return <PodcastClient episodes={episodes} initial={initial} />;
}
