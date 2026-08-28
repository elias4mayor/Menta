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
// Matches @keyframes miExit in globals.css — previously defined but never
// actually triggered (each phase's content used to unmount instantly, with
// only the *next* phase's enter animation playing). Content now runs this
// exit before the next phase's content mounts, so nothing hard-cuts.
const CONTENT_EXIT_MS = 240;

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
        <IntroContent phase={phase} firstName={firstName} copy={copy} />
      </div>

      {/* Screen-reader-only announcement — the overlay itself is aria-hidden
          (purely decorative motion), so this is the one line that actually
          orients a non-visual first-time user before the real form
          appears. */}
      <span className="sr-only">{`Welcome to MENTA, ${firstName}.`}</span>
    </div>
  );
}

/**
 * Renders whichever content-bearing phase is currently showing, and — new —
 * actually runs the exit half of the fade before the next phase's content
 * mounts, instead of the previous content vanishing the instant `phase`
 * changes. (`.mi-content.mi-exit` / `@keyframes miExit` already existed in
 * globals.css but nothing ever applied them; this is what wires them up.)
 * Kept as its own component, not inlined in MentaIntro, so that internal
 * exit-delay state doesn't affect the parent's absolute phase timers at all
 * — logo/glow timing is untouched by this.
 */
function IntroContent({
  phase,
  firstName,
  copy,
}: {
  phase: Phase;
  firstName: string;
  copy: { message: string; categories: string };
}) {
  const [displayed, setDisplayed] = useState<Phase>(phase);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `phase !== displayed` *is* the exiting state — no separate state needed
  // (and setting one synchronously in this effect's body is exactly the
  // cascading-render pattern react-hooks/set-state-in-effect flags). The
  // effect's only setState call is the async one inside the timeout below.
  useEffect(() => {
    if (phase === displayed) return;
    exitTimer.current = setTimeout(() => setDisplayed(phase), CONTENT_EXIT_MS);
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [phase, displayed]);

  const isExiting = phase !== displayed;
  const className = `mi-content ${isExiting ? "mi-exit" : "mi-enter"}`;

  if (displayed === "hello") {
    return (
      <div className={className}>
        <StaggerWords text="HELLO." />
      </div>
    );
  }

  if (displayed === "welcome") {
    return (
      <div className={className}>
        <StaggerWords text="Welcome to MENTA." />
        <div className="mi-line-sub mi-personal">{`Let’s build your next level, ${firstName}.`}</div>
      </div>
    );
  }

  if (displayed === "role") {
    return (
      <div className={className}>
        <div className="mi-line">{copy.message}</div>
      </div>
    );
  }

  if (displayed === "categories") {
    return (
      <div className={className}>
        <div className="mi-line">ONE PLACE FOR WHAT&rsquo;S NEXT.</div>
        <CategoryWords text={copy.categories} />
      </div>
    );
  }

  if (displayed === "build") {
    return (
      <div className={className}>
        <div className="mi-line" style={{ fontSize: "clamp(22px, 4vw, 32px)" }}>
          LET&rsquo;S BUILD YOUR MENTA.
        </div>
      </div>
    );
  }

  return null;
}

// Word-by-word reveal for the two headline beats ("HELLO." / "Welcome to
// MENTA.") — the prompt's "important introductory text" — via staggered
// per-word opacity/translateY, not a typewriter effect. A plain space text
// node between spans (not a non-breaking space) so long lines still wrap
// naturally on narrow screens.
function StaggerWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <div className="mi-line">
      {words.flatMap((word, i) => [
        <span key={`w${i}`} className="mi-word" style={{ animationDelay: `${i * 55}ms` }}>
          {word}
        </span>,
        i < words.length - 1 ? " " : null,
      ])}
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
