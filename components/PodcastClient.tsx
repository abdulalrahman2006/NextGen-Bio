"use client";
import dynamic from "next/dynamic";
import type { Episode } from "./PodcastScene";
const PodcastScene = dynamic(() => import("./PodcastScene"), { ssr: false });
export default function PodcastClient({ episodes, initial }: { episodes: Episode[]; initial: number }) {
  return <PodcastScene episodes={episodes} initial={initial} />;
}
