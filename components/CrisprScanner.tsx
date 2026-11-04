"use client";
import { useEffect, useState } from "react";

const COMP: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const rand = (n: number) => Array.from({ length: n }, () => "ATGC"[Math.floor(Math.random() * 4)]).join("");

export default function CrisprScanner() {
  const [guide, setGuide] = useState("GATTACAGGCTA");
  const [genome, setGenome] = useState("");
  const [pos, setPos] = useState(0);
  const [hits, setHits] = useState<number[]>([]);
  const [running, setRunning] = useState(false);

  const build = () => {
    const g = guide.toUpperCase().replace(/[^ATGC]/g, "");
    let s = rand(60) + g + rand(40) + g + rand(30);
    setGenome(s); setPos(0); setHits([]); setRunning(false);
  };
  useEffect(build, []); // eslint-disable-line

  useEffect(() => {
    if (!running) return;
    const g = guide.toUpperCase();
    const id = setInterval(() => {
      setPos((p) => {
        if (p + g.length > genome.length) { setRunning(false); return p; }
        if (genome.slice(p, p + g.length) === g) setHits((h) => [...h, p]);
        return p + 1;
      });
    }, 40);
    return () => clearInterval(id);
  }, [running, genome, guide]);

  const g = guide.toUpperCase();
  const window_ = genome.slice(pos, pos + g.length);
  return (
    <div className="border border-slate7 p-6">
      <h3 className="font-black text-2xl tracking-tight">CRISPR sequence scanner</h3>
      <p className="mb-4 mt-1 text-xs text-slate3">Demo: scans a randomly generated genome. Not real data.</p>
      <label className="text-sm text-slate3">Guide sequence (A, T, G, C)</label>
      <input value={guide} onChange={(e) => setGuide(e.target.value.toUpperCase().replace(/[^ATGC]/g, "").slice(0, 16))}
        className="w-full border-b-2 border-slate5 bg-transparent font-mono text-paper text-xl py-2 mb-4" />
      <div className="font-mono text-sm break-all leading-7 max-h-28 overflow-hidden" aria-label="Genome sequence">
        {genome.split("").map((c, i) => (
          <span key={i} className={hits.some((h) => i >= h && i < h + g.length) ? "bg-gold text-night" : i >= pos && i < pos + g.length ? "bg-slate7 text-paper" : ""}>{c}</span>
        ))}
      </div>
      <p className="font-mono text-sm mt-3 text-slate3">Pairing: {window_.split("").map((c) => COMP[c] ?? "·").join("")}</p>
      <div className="flex items-center gap-4 mt-4">
        <button onClick={() => (running ? setRunning(false) : setRunning(true))} className="bg-gold text-night px-5 py-2 font-bold hover:bg-paper">
          {running ? "Pause" : "Scan genome"}
        </button>
        <button onClick={build} className="underline">New genome</button>
        <span className="ml-auto font-bold">{hits.length} matches</span>
      </div>
    </div>
  );
}
