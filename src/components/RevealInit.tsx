"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for marketing pages: mount once, and any element with the
 * `.reveal` class gets `.in` added when it scrolls into view (see the
 * `.reveal`/`.reveal.in` rules in globals.css). Kept out of the
 * authenticated app — data-heavy dashboard pages shouldn't pay for this.
 */
export function RevealInit() {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    if (elements.length === 0) return;

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
  }, []);

  return null;
}
