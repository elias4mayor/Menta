"use client";

import Link from "next/link";
import { useRef } from "react";

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const hero = heroRef.current;
    const glow = glowRef.current;
    if (hero && glow) {
      const rect = hero.getBoundingClientRect();
      glow.style.left = `${e.clientX - rect.left}px`;
      glow.style.top = `${e.clientY - rect.top}px`;
      glow.style.opacity = "1";
    }

    const mockup = mockupRef.current;
    if (mockup) {
      const rect = mockup.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (Math.abs(x) <= 0.6 && Math.abs(y) <= 0.6) {
        mockup.style.transform = `perspective(1000px) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
      }
    }
  }

  function onMouseLeave() {
    if (glowRef.current) glowRef.current.style.opacity = "0";
    if (mockupRef.current) mockupRef.current.style.transform = "";
  }

  return (
    <section
      ref={heroRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative px-6 md:px-10 pt-32 md:pt-40 pb-24 overflow-hidden"
    >
      <div ref={glowRef} className="cursor-glow" />
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-semibold leading-[1.05] mb-6 reveal">
          Build the future of
          <br />
          <span className="shiny-text">athlete development.</span>
        </h1>
        <p className="text-text-2 text-lg max-w-xl mb-8 reveal">
          MENTA is the AI operating system helping athletes improve performance, mindset,
          academics, recruiting, and recovery — all in one platform.
        </p>
        <div className="flex flex-wrap gap-3 reveal">
          <Link href="/signup" className="btn-primary">
            Join Beta
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/faq" className="btn-secondary">
            Read the FAQ
          </Link>
        </div>

        <div
          ref={mockupRef}
          className="card tilt-card mt-16 p-6 max-w-lg reveal"
          style={{ transition: "transform 0.25s ease-out" }}
        >
          <div className="glass-sheen" />
          <div className="mono text-text-3 mb-4">Example — My MENTA dashboard</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-2 rounded-[var(--r-sm)] p-3">
              <div className="mono text-text-3 mb-2">Readiness</div>
              <div className="text-2xl font-semibold">92</div>
            </div>
            <div className="bg-surface-2 rounded-[var(--r-sm)] p-3">
              <div className="mono text-text-3 mb-2">Weekly load</div>
              <div className="flex items-end gap-1 h-8">
                {[40, 65, 50, 85, 60, 95, 45].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: "var(--grad-signal)" }} />
                ))}
              </div>
            </div>
            <div className="bg-surface-2 rounded-[var(--r-sm)] p-3">
              <div className="mono text-text-3 mb-2">GPA</div>
              <div className="text-2xl font-semibold">3.8</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
