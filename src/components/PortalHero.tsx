"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Scroll-driven "portal" hero: two panels start closed over a real MENTA
 * photo, part outward as the reader scrolls, while the wordmark grows and
 * its letter-spacing tightens. Everything is bound to scroll position (not
 * a timer) via a single CSS custom property (--p, 0..1) set on the
 * container, so it reverses cleanly on scroll-up and needs no React state
 * per frame.
 *
 * Accessibility: the scroll-driven behavior only activates via the
 * `.portal-active` class, added client-side only when the reader has NOT
 * requested reduced motion. Without that class (reduced motion, or no JS
 * at all) every element falls back to its default CSS state — panels
 * already open, wordmark at rest — so the photo is never hidden behind an
 * animation that can't run.
 */
export function PortalHero() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = sectionRef.current;
    if (reduceMotion || !section) return;

    section.classList.add("portal-active");
    let ticking = false;

    function update() {
      ticking = false;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
      el.style.setProperty("--p", progress.toFixed(4));
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={sectionRef} className="portal-hero">
      <div className="portal-hero-stage">
        <div
          className="portal-hero-image"
          style={{ backgroundImage: "url(/gallery/gallery-01.jpg)" }}
          role="img"
          aria-label="MENTA athlete"
        />
        <div className="portal-hero-vignette" aria-hidden="true" />

        <div className="portal-hero-dot portal-hero-dot-a" aria-hidden="true" />
        <div className="portal-hero-dot portal-hero-dot-b" aria-hidden="true" />

        <div className="portal-hero-meta portal-hero-meta-top mono">Athlete Operating System</div>
        <div className="portal-hero-meta portal-hero-meta-bottom mono">
          Build the athlete. Build the mind.
        </div>

        <div className="portal-hero-panel portal-hero-panel-left" aria-hidden="true" />
        <div className="portal-hero-panel portal-hero-panel-right" aria-hidden="true" />

        <h1 className="portal-hero-title" aria-label="MENTA">
          <span className="portal-hero-title-a">MEN</span>
          <span className="portal-hero-title-b">TA</span>
        </h1>

        <div className="portal-hero-cta">
          <Link href="/signup" className="btn-primary">
            Join Beta
          </Link>
          <Link href="/faq" className="btn-secondary">
            Read the FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
