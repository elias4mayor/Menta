"use client";

import Link from "next/link";
import { useRef } from "react";
import { LiveGallery, GALLERY_SLIDES } from "@/components/LiveGallery";

const METRICS = [
  { label: "Readiness", value: "92" },
  { label: "Weekly Load", value: "Optimal" },
  { label: "GPA", value: "3.8" },
  { label: "Recovery", value: "87%" },
  { label: "Recruiting", value: "12 Opportunities" },
];

export function Hero() {
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
    <section className="relative px-6 md:px-10 pt-40 md:pt-48 pb-24 text-center overflow-hidden">
      <LiveGallery slides={GALLERY_SLIDES} heroBg />
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center hero-on-dark">
        <h1 className="text-text-1 text-5xl md:text-7xl font-semibold leading-[1.05] mb-6 reveal">
          Build the future of athlete development.
        </h1>
        <p className="text-text-2 text-lg max-w-xl mb-8 reveal">
          MENTA is the AI Athlete Operating System helping athletes improve performance, mindset,
          academics, recruiting, recovery, and long-term development — all in one intelligent
          platform.
        </p>
        <div className="flex flex-wrap justify-center gap-3 reveal">
          <Link href="/signup" className="btn-primary">
            Join the MENTA Beta
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="#platform" className="btn-secondary">
            Explore MENTA
          </Link>
        </div>
        <p className="text-text-3 text-sm mt-6 reveal">
          Built for athletes. Designed for teams. Powered by AI.
        </p>

        <div
          ref={mockupRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className="card tilt-card mt-16 p-6 md:p-8 w-full max-w-2xl reveal text-left"
          style={{ transition: "transform 0.25s ease-out" }}
        >
          <div className="glass-sheen" />
          <div className="mono text-text-3 mb-5 text-center">Your MENTA Dashboard</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {METRICS.map((m) => (
              <div key={m.label} className="bg-surface-2 rounded-[var(--r-sm)] p-3 text-center">
                <div className="mono text-text-3 mb-2 text-[10px]">{m.label}</div>
                <div className="text-lg font-semibold leading-tight">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-[var(--border-soft)] flex items-start gap-3">
            <span className="mono text-text-3 text-[10px] shrink-0 mt-0.5">MENTA AI</span>
            <p className="text-text-2 text-sm leading-snug">
              Your workload is trending higher this week. Consider adjusting tomorrow&rsquo;s
              recovery session.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
