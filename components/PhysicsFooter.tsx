"use client";
import { useRef } from "react";
import gsap from "gsap";

/** Elastic SVG string: drag it, release, and it snaps back with GSAP elastic easing. */
export default function PhysicsFooter() {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const dragging = useRef(false);
  const W = 1000, Y = 60;
  const draw = (x: number, y: number) => path.current?.setAttribute("d", `M0 ${Y} Q ${x} ${y} ${W} ${Y}`);

  const point = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * 120 };
  };
  const down = (e: React.PointerEvent) => {
    dragging.current = true;
    svg.current!.setPointerCapture(e.pointerId);
    gsap.killTweensOf(state);
  };
  const state = { x: W / 2, y: Y };
  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const p = point(e);
    state.x = p.x; state.y = Math.max(0, Math.min(120, p.y));
    draw(state.x, state.y * 2 - Y);
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    gsap.to(state, {
      y: Y, x: W / 2, duration: 1.6, ease: "elastic.out(1.1, 0.25)",
      onUpdate: () => draw(state.x, state.y * 2 - Y),
    });
  };
  return (
    <footer className="surface-dark bg-slate9 text-paper border-t border-slate7 pt-16 pb-6 pl-10 md:pl-16 pr-6">
      <p className="brut text-[8vw]">Pull the string.</p>
      <svg ref={svg} viewBox={`0 0 ${W} 120`} className="w-full h-28 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <path ref={path} d={`M0 ${Y} Q ${W / 2} ${Y} ${W} ${Y}`} stroke="#D9A15F" strokeWidth="3" fill="none" />
        <rect x="0" y="0" width={W} height="120" fill="transparent" />
      </svg>
      <p className="text-slate3 text-sm">© NextGen Bio — written by students, edited by students.</p>
    </footer>
  );
}
