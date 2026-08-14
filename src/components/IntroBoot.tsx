"use client";

import { useEffect, useRef } from "react";

/**
 * One-time premium logo reveal on first load of the home page — matches the
 * reference site's boot-flash behavior exactly: once per browser session
 * (sessionStorage), skipped entirely under prefers-reduced-motion, ~2.9s
 * total (2.4s hold + 0.5s fade), body scroll locked while it plays.
 */
export function IntroBoot() {
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem("mentaBootPlayed")) return;
    sessionStorage.setItem("mentaBootPlayed", "1");

    document.body.style.overflow = "hidden";
    mark.classList.add("boot");

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        mark.classList.add("show");
      });
      mark.dataset.raf2 = String(raf2);
    });

    const fadeTimer = setTimeout(() => {
      mark.classList.add("fade");
      const removeTimer = setTimeout(() => {
        mark.classList.remove("show", "fade", "boot");
        document.body.style.overflow = "";
      }, 500);
      mark.dataset.removeTimer = String(removeTimer);
    }, 2400);

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
