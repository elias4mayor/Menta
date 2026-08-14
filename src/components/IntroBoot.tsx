"use client";

import { useEffect, useRef } from "react";

// Module-scope, not storage: resets on every fresh document load (hard
// refresh, typing the URL, opening a new tab) so it's trivial to preview
// during development — just reload. It survives client-side (SPA)
// navigation within that same page session, so clicking around the app and
// back to "/" doesn't replay it. sessionStorage/localStorage would get
// either of those two behaviors right but not both at once.
let hasPlayedThisPageLoad = false;

const HOLD_MS = 1600;
const FADE_MS = 400;

/**
 * One-time-per-page-load premium logo reveal on the home page. ~2s total
 * (1.6s hold + 0.4s fade), skipped entirely under prefers-reduced-motion,
 * body scroll locked only while it plays.
 */
export function IntroBoot() {
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (hasPlayedThisPageLoad) return;
    hasPlayedThisPageLoad = true;

    document.body.style.overflow = "hidden";
    mark.classList.add("boot");

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mark.classList.add("show");
      });
    });

    const fadeTimer = setTimeout(() => {
      mark.classList.add("fade");
      setTimeout(() => {
        mark.classList.remove("show", "fade", "boot");
        document.body.style.overflow = "";
      }, FADE_MS);
    }, HOLD_MS);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(fadeTimer);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div ref={markRef} className="logo-intro-mark" id="logoIntroMark" aria-hidden="true">
      <div className="intro-glow" />
      <div className="intro-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element -- static local asset, no responsive sizing needed for a one-time boot overlay */}
        <img src="/logo.png" alt="" />
        <div className="intro-logo-sheen" />
      </div>
      <div className="intro-slogan">The Athlete Operating System.</div>
    </div>
  );
}
