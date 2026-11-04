"use client";
import { useEffect, useState } from "react";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export default function FermentationMonitor() {
  const [m, setM] = useState({ temp: 37, ph: 6.8, yieldG: 0 });
  const [hist, setHist] = useState<number[]>([37]);
  useEffect(() => {
    const id = setInterval(() => {
      setM((p) => {
        const n = { temp: clamp(p.temp + (Math.random() - 0.5) * 0.4, 35, 39), ph: clamp(p.ph + (Math.random() - 0.5) * 0.06, 6.4, 7.2), yieldG: p.yieldG + Math.random() * 0.35 };
        setHist((h) => [...h.slice(-39), n.temp]);
        return n;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const status = (ok: boolean) => (ok ? "Stable" : "Out of range");
  const pts = hist.map((t, i) => `${(i / 39) * 100},${40 - ((t - 35) / 4) * 40}`).join(" ");
  return (
    <div className="border border-slate7 p-6">
      <h3 className="font-black text-2xl tracking-tight mb-4">Fermentation monitor</h3>
      <dl className="grid grid-cols-3 gap-4">
        {[
          ["Temp", `${m.temp.toFixed(1)} °C`, status(m.temp > 36 && m.temp < 38)],
          ["pH", m.ph.toFixed(2), status(m.ph > 6.6 && m.ph < 7.0)],
          ["Yield", `${m.yieldG.toFixed(1)} g/L`, "Accumulating"],
        ].map(([k, v, s]) => (
          <div key={k} className="border-t-2 border-gold pt-2">
            <dt className="text-slate3 text-sm">{k}</dt>
            <dd className="text-3xl font-black tabular-nums">{v}</dd>
            <dd className="text-xs text-slate3">{s}</dd>
          </div>
        ))}
      </dl>
      <svg viewBox="0 0 100 40" className="w-full h-20 mt-6" preserveAspectRatio="none" aria-label="Temperature history">
        <polyline points={pts} fill="none" stroke="#D9A15F" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="text-xs text-slate3 mt-2">Simulated data, updates every second.</p>
    </div>
  );
}
