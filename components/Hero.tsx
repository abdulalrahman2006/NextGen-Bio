"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

export default function Hero({ line1, line2, intro, compact = false, children }: { line1: string; line2: string; intro: string; compact?: boolean; children?: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.from(".reveal", { yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.15 });
    gsap.from(".fade", { opacity: 0, duration: 0.8, delay: 0.7 });
  }, { scope: root });
  return (
    <section ref={root} className={compact ? "pb-16 pr-4 pt-40" : "flex min-h-screen flex-col justify-end pb-14 pr-4"}>
      <h1 className="brut text-[10vw]">
        <span className="mask"><span className="reveal">{line1}</span></span>
        <span className="mask text-gold"><span className="reveal">{line2}</span></span>
      </h1>
      <p className="fade mt-8 max-w-xl text-lg text-slate3">{intro}</p>
      {children}
    </section>
  );
}
