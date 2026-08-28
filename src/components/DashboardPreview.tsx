"use client";

import { useRef } from "react";
import { CountUpValue } from "@/components/CountUpValue";

type Metric =
  | { label: string; kind: "text"; text: string; caption?: string }
  | { label: string; kind: "number"; value: number; decimals?: number; suffix?: string; caption?: string };

const METRICS: Metric[] = [
  { label: "Readiness", kind: "number", value: 92 },
  { label: "Weekly Load", kind: "text", text: "Optimal" },
  { label: "GPA", kind: "number", value: 3.8, decimals: 1 },
  { label: "Recovery", kind: "number", value: 87, suffix: "%" },
  { label: "Recruiting", kind: "number", value: 12, caption: "Opportunities" },
];

/** Stagger start for the tile grid, after the frame itself has begun settling in. */
const TILE_BASE_DELAY_MS = 250;
const TILE_STEP_MS = 90;

export function DashboardPreview() {
  const frameRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    if (Math.abs(x) <= 0.6 && Math.abs(y) <= 0.6) {
      frame.style.transform = `perspective(1400px) rotateX(${y * -2.5}deg) rotateY(${x * 2.5}deg)`;
    }
  }

  function onMouseLeave() {
    if (frameRef.current) frameRef.current.style.transform = "";
  }

  return (
    <div className="laptop-frame reveal reveal-scale mx-auto w-full max-w-3xl">
      <div
        ref={frameRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="laptop-frame-bezel"
        style={{ transition: "transform 0.25s ease-out" }}
      >
        <div className="laptop-frame-screen p-6 md:p-8 text-left">
          <div className="mono text-text-3 mb-6 text-center">Your MENTA Dashboard</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {METRICS.map((m, i) => (
              <div
                key={m.label}
                className="bg-surface-2 rounded-[var(--r-sm)] p-4 h-full flex flex-col items-center justify-center text-center reveal reveal-scale"
                style={{ transitionDelay: `${TILE_BASE_DELAY_MS + i * TILE_STEP_MS}ms` }}
              >
                <div className="mono text-text-3 mb-2 text-xs">{m.label}</div>
                <div className="text-2xl font-semibold leading-tight whitespace-nowrap">
                  {m.kind === "text" ? (
                    m.text
                  ) : (
                    <CountUpValue value={m.value} decimals={m.decimals} suffix={m.suffix} />
                  )}
                </div>
                {m.caption && <div className="text-text-3 text-xs mt-1">{m.caption}</div>}
              </div>
            ))}
          </div>
          <div
            className="mt-6 pt-6 border-t border-[var(--border-soft)] flex items-start gap-3 reveal reveal-scale"
            style={{ transitionDelay: `${TILE_BASE_DELAY_MS + METRICS.length * TILE_STEP_MS}ms` }}
          >
            <span className="mono text-text-3 text-xs shrink-0 mt-0.5">MENTA AI</span>
            <p className="text-text-2 text-sm leading-relaxed">
              Your workload is trending higher this week. Consider adjusting tomorrow&rsquo;s
              recovery session.
            </p>
          </div>
        </div>
      </div>
      <div className="laptop-frame-base" />
    </div>
  );
}
