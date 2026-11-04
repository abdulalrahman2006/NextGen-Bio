"use client";
import { useEffect, useState } from "react";

export default function StudyNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-30% 0px -60% 0px" });
    items.forEach((i) => { const el = document.getElementById(i.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="On this page" className="hidden md:block sticky top-28 self-start">
      <p className="text-sm text-slate5 mb-4">On this page</p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className={`font-bold transition-colors ${active === i.id ? "text-gold" : "text-slate5 hover:text-paper"}`}>{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
