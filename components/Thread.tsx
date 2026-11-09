"use client";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Gold line that draws itself down the left margin as the page scrolls. */
export default function Thread() {
  const path = useRef<SVGPathElement>(null);
  useGSAP(() => {
    const p = path.current!;
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(p, {
      strokeDashoffset: 0, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.6 },
    });
  }, []);
  return (
    <svg aria-hidden className="pointer-events-none fixed left-4 md:left-[14.5rem] top-0 z-10 h-screen w-6" viewBox="0 0 24 1000" preserveAspectRatio="none">
      <path ref={path} d="M12 0 C 22 120, 2 240, 12 360 S 22 600, 12 720 S 2 900, 12 1000" fill="none" stroke="#D9A15F" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
