"use client";

import { useRef } from "react";

const METRICS: { label: string; value: string; caption?: string }[] = [
  { label: "Readiness", value: "92" },
  { label: "Weekly Load", value: "Optimal" },
  { label: "GPA", value: "3.8" },
  { label: "Recovery", value: "87%" },
  { label: "Recruiting", value: "12", caption: "Opportunities" },
];

export function DashboardPreview() {
  const mockupRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const mockup = mockupRef.current;
    if (!mockup) return;
    const rect = mockup.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    if (Math.abs(x) <= 0.6 && Math.abs(y) <= 0.6) {
      mockup.style.transform = `perspective(1200px) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`;
    }
  }

  function onMouseLeave() {
    if (mockupRef.current) mockupRef.current.style.transform = "";
  }

  return (
    <div
      ref={mockupRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card tilt-card mx-auto p-8 md:p-10 w-full max-w-3xl reveal text-left"
      style={{ transition: "transform 0.25s ease-out" }}
    >
      <div className="glass-sheen" />
      <div className="mono text-text-3 mb-6 text-center">Your MENTA Dashboard</div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="bg-surface-2 rounded-[var(--r-sm)] p-4 h-full flex flex-col items-center justify-center text-center"
          >
            <div className="mono text-text-3 mb-2 text-xs">{m.label}</div>
            <div className="text-2xl font-semibold leading-tight whitespace-nowrap">{m.value}</div>
            {m.caption && <div className="text-text-3 text-xs mt-1">{m.caption}</div>}
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-[var(--border-soft)] flex items-start gap-3">
        <span className="mono text-text-3 text-xs shrink-0 mt-0.5">MENTA AI</span>
        <p className="text-text-2 text-sm leading-relaxed">
          Your workload is trending higher this week. Consider adjusting tomorrow&rsquo;s recovery
          session.
        </p>
      </div>
    </div>
  );
}
