"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for marketing pages: mount once, and any element with the
 * `.reveal` class gets `.in` added when it scrolls into view (see the
 * `.reveal`/`.reveal.in` rules in globals.css). Kept out of the
 * authenticated app — data-heavy dashboard pages shouldn't pay for this.
 *
 * A second, separate observer drives `.depth-visual` — the small set of
 * "most important visual moments" (product preview, feature visuals, the
 * mission statement) that get a continuous sense of depth as they cross
 * the viewport, not just a one-time reveal. Deliberately still just an
 * IntersectionObserver (many thresholds, so --depth updates in ~20 steps
 * as the element crosses), not a scroll/rAF listener recomputing on every
 * pixel — the same "efficient observer, not expensive scroll math"
 * tradeoff the rest of this file already makes.
 */
export function RevealInit() {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    if (elements.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
      );

      elements.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const depthElements = document.querySelectorAll(".depth-visual");
    if (depthElements.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    const depthObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).style.setProperty("--depth", String(entry.intersectionRatio));
        }
      },
      { threshold: thresholds }
    );

    depthElements.forEach((el) => depthObserver.observe(el));
    return () => depthObserver.disconnect();
  }, []);

  return null;
}
