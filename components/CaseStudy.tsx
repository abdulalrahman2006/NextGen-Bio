import type { ReactNode } from "react";

export function Chapter({ id, n, label, title, children }: { id: string; n: number; label: string; title: string; children?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-slate7 pt-8 pb-28">
      <p className="text-sm text-slate5 mb-6">{String(n).padStart(2, "0")} / {label}</p>
      <h2 className="chapter-title max-w-4xl">{title}</h2>
      <div className="mt-8 max-w-2xl text-lg leading-relaxed text-slate3">{children}</div>
    </section>
  );
}

export function MetaGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid md:grid-cols-3 gap-x-10 gap-y-6 border-t border-slate7 py-8 pr-6">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-slate5">{k}</dt>
          <dd className="mt-1 text-xl font-bold leading-snug">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
