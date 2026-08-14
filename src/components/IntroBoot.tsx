"use client";

import { useEffect, useState } from "react";

// Module-scope, not storage: resets on every fresh document load (hard
// refresh, typing the URL, opening a new tab) so it's trivial to preview
// during development — just reload. It survives client-side (SPA)
// navigation within that same page session, so clicking around the app and
// back to "/" doesn't replay it. sessionStorage/localStorage would get
// either of those two behaviors right but not both at once.
let hasPlayedThisPageLoad = false;

const HOLD_MS = 1400;
const FADE_MS = 400;
// Hard exit, independent of everything else — guarantees the overlay can
// never stay stuck longer than this, no matter what goes wrong above it.
const FAILSAFE_MS = 3000;

type Phase = "hidden" | "boot" | "show" | "fade";

/**
 * One-time-per-page-load premium logo reveal on the home page. ~1.8s total
 * (1.4s hold + 0.4s fade), skipped under prefers-reduced-motion, with a
 * hard 3s failsafe. State-driven (not manual classList mutation) so the
 * rendered output always matches React's own state — nothing to get out of
 * sync.
 */
export function IntroBoot() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number | null = null;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let failsafeTimer: ReturnType<typeof setTimeout> | null = null;

    function finish() {
      setPhase("hidden");
      document.body.style.overflow = "";
    }

    function beginBoot() {
      document.body.style.overflow = "hidden";
      setPhase("boot");

      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => setPhase("show"));
      });

      fadeTimer = setTimeout(() => setPhase("fade"), HOLD_MS);
      hideTimer = setTimeout(finish, HOLD_MS + FADE_MS);
      failsafeTimer = setTimeout(finish, FAILSAFE_MS);
    }

    // Deferred to a macrotask rather than run synchronously: React
    // StrictMode's dev-only double-invoke (mount -> cleanup -> mount) runs
    // entirely synchronously, before any setTimeout callback fires. If this
    // mount is that discarded "phantom" first pass, its cleanup below
    // cancels this timer before it ever runs, so the "already played" flag
    // never gets falsely consumed — the real, persisting mount's own
    // deferred start then runs normally a moment later and the animation
    // plays exactly once. (The previous version set the flag and mutated
    // the DOM synchronously inside the effect; StrictMode's phantom mount
    // consumed the flag and left the overlay's CSS classes applied, and its
    // cleanup only cancelled timers without removing them — so the real
    // mount saw "already played" and never scheduled anything to remove
    // them. That's what caused the permanent black screen.)
    const startTimer = setTimeout(() => {
      if (hasPlayedThisPageLoad) return;
      hasPlayedThisPageLoad = true;
      beginBoot();
    }, 0);

    return () => {
      clearTimeout(startTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (failsafeTimer) clearTimeout(failsafeTimer);
      // Symmetric cleanup: undo whatever this effect instance may have
      // started, so an interrupted run (StrictMode, fast refresh, or a
      // genuine unmount) never leaves the overlay visible with nothing left
      // to resolve it.
      setPhase("hidden");
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "hidden") return null;

  const classNames = ["logo-intro-mark", "boot"];
  if (phase === "show" || phase === "fade") classNames.push("show");
  if (phase === "fade") classNames.push("fade");

  return (
    <div className={classNames.join(" ")} aria-hidden="true">
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
