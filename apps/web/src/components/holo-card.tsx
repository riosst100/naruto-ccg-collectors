"use client";

import { useRef } from "react";

export type RarityTier = "common" | "rare" | "super" | "ultra" | "secret";

/** Wraps a card image with a pointer-driven 3D tilt and holographic foil layers (styles: `.holo` in globals.css). */
export function HoloCard({ tier, className = "", children }: { tier: RarityTier; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 16}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 16}deg`);
    el.style.setProperty("--o", "1");
    el.dataset.active = "true";
  }
  function leave() {
    const el = ref.current;
    if (!el) return;
    for (const k of ["--mx", "--my", "--rx", "--ry", "--o"]) el.style.removeProperty(k);
    el.dataset.active = "false";
  }

  return (
    <div ref={ref} data-tier={tier} onPointerMove={move} onPointerLeave={leave} className={`holo ${className}`}>
      {children}
      <span className="holo-foil" aria-hidden />
      <span className="holo-sparkle" aria-hidden />
      <span className="holo-sweep" aria-hidden />
    </div>
  );
}
