"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "empty" | "mark" | "hello" | "welcome" | "role" | "categories" | "build" | "reveal";

const ROLE_COPY: Record<string, { message: string; categories: string }> = {
  ATHLETE: {
    message: "YOUR JOURNEY STARTS HERE.",
    categories: "PERFORMANCE. MINDSET. RECOVERY. DEVELOPMENT.",
  },
  COACH: {
    message: "YOUR TEAM STARTS HERE.",
    categories: "TEAM. PERFORMANCE. DEVELOPMENT. COMMUNICATION.",
  },
  PARENT: {
    message: "YOUR ATHLETE’S JOURNEY STARTS HERE.",
    categories: "SUPPORT. DEVELOPMENT. ACADEMICS. RECOVERY.",
  },
  TRAINER: {
    message: "YOUR ATHLETES’ DEVELOPMENT STARTS HERE.",
    categories: "TRAINING. PERFORMANCE. PROGRESS. CONNECTION.",
  },
};

// Absolute offsets (ms) from mount — see the phase-by-phase breakdown this
// mirrors in the "MENTA — Premium First-Launch Experience" spec: an empty
// hold, logo mark, HELLO / Welcome to MENTA, role-personalized line, "one
// place for what's next" + category words, logo-shrink + build line, then
// the fade that hands off to the real onboarding content underneath.
const T_MARK = 800;
const T_HELLO = 2200;
const T_WELCOME = 3500;
const T_ROLE = 4800;
const T_CATEGORIES = 7000;
const T_CATEGORIES_WORDS = 7500;
const T_BUILD = 9800;
const T_REVEAL = 12000;
const REVEAL_MS = 900;

/**
 * One-time, first-launch-only cinematic intro. Reached only via the
 * signup -> /onboarding redirect (there's no other route into /onboarding
 * and nothing sends a returning user there), so no separate "have I seen
 * this" flag is needed — it plays because this is, structurally, always
 * the first visit. Identical visuals for every role; only the two
 * role-personalized lines (role message + category words) change. White
 * throughout (same tokens .onb-root reads), so it ends with a plain
 * opacity fade of the whole overlay and calls onDone, at which point the
 * parent swaps in the real (unchanged, already-built) onboarding content
 * underneath — already the same white, with the same small logo mark
 * already sitting in the same spot, so the handoff has nothing left to
 * visually reconcile.
 */
export function MentaIntro({
  role,
  firstName,
  onDone,
}: {
  role: string;
  firstName: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("empty");
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const copy = ROLE_COPY[role] ?? ROLE_COPY.ATHLETE;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current();
      return;
    }

    const timers = [
      setTimeout(() => setPhase("mark"), T_MARK),
      setTimeout(() => setPhase("hello"), T_HELLO),
      setTimeout(() => setPhase("welcome"), T_WELCOME),
      setTimeout(() => setPhase("role"), T_ROLE),
      setTimeout(() => setPhase("categories"), T_CATEGORIES),
      setTimeout(() => setPhase("build"), T_BUILD),
      setTimeout(() => setPhase("reveal"), T_REVEAL),
      setTimeout(() => doneRef.current(), T_REVEAL + REVEAL_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Visible alone for the "mark" beat, hidden while the big centered text
  // lines take over the same stage (nothing to collide with), then back as
  // the small persistent mark from "build" onward.
  const logoOn = phase === "mark" || phase === "build" || phase === "reveal";
  const logoSmall = phase === "build" || phase === "reveal";
  const revealing = phase === "reveal";
  const glowOn = phase !== "empty" && phase !== "reveal";

  return (
    <div className={`mi-root${revealing ? " mi-revealing" : ""}`} aria-hidden="true">
      <div className={`mi-glow${glowOn ? " mi-glow-on" : ""}`} />

      {/* eslint-disable-next-line @next/next/no-img-element -- static local asset; filter/position are animated inline via CSS transitions, not Next/Image's layout system */}
      <img
        src="/logo.png"
        alt=""
        className={`mi-logo${logoOn ? " mi-logo-on" : ""}${logoSmall ? " mi-logo-small" : ""}`}
      />

      <div className="mi-stage">
        {phase === "hello" && (
          <div className="mi-content mi-enter">
            <div className="mi-line">HELLO.</div>
          </div>
        )}

        {phase === "welcome" && (
          <div className="mi-content mi-enter">
            <div className="mi-line">Welcome to MENTA.</div>
          </div>
        )}

        {phase === "role" && (
          <div className="mi-content mi-enter">
            <div className="mi-line">{copy.message}</div>
          </div>
        )}

        {phase === "categories" && (
          <div className="mi-content mi-enter">
            <div className="mi-line">ONE PLACE FOR WHAT&rsquo;S NEXT.</div>
            <CategoryWords text={copy.categories} />
          </div>
        )}

        {phase === "build" && (
          <div className="mi-content mi-enter">
            <div className="mi-line" style={{ fontSize: "clamp(22px, 4vw, 32px)" }}>
              LET&rsquo;S BUILD YOUR MENTA.
            </div>
          </div>
        )}
      </div>

      {/* Screen-reader-only announcement — the overlay itself is aria-hidden
          (purely decorative motion), so this is the one line that actually
          orients a non-visual first-time user before the real form
          appears. */}
      <span className="sr-only">{`Welcome to MENTA, ${firstName}.`}</span>
    </div>
  );
}

function CategoryWords({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setOn(true), T_CATEGORIES_WORDS - T_CATEGORIES);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={`mi-line-sub mi-categories${on ? " mi-categories-on" : ""}`}>{text}</div>
  );
}
