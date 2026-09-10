"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { IslandState } from "@/lib/island";

const GHOST_IDLE_MS = 7000;

type JourneyStage = { key: string; label: string; href: string };

const JOURNEY: JourneyStage[] = [
  { key: "train", label: "Train", href: "/train" },
  { key: "perform", label: "Perform", href: "/performance" },
  { key: "recover", label: "Recover", href: "/recovery" },
  { key: "learn", label: "Learn", href: "/school" },
  { key: "film", label: "Film", href: "/film" },
  { key: "recruit", label: "Recruit", href: "/recruit" },
  { key: "develop", label: "Develop", href: "/profile" },
];

function journeyKeyForPath(pathname: string): string | null {
  if (pathname.startsWith("/train")) return "train";
  if (pathname.startsWith("/performance")) return "perform";
  if (pathname.startsWith("/recovery") || pathname.startsWith("/mind")) return "recover";
  if (pathname.startsWith("/school")) return "learn";
  if (pathname.startsWith("/film") || pathname.startsWith("/assignments")) return "film";
  if (pathname.startsWith("/recruit")) return "recruit";
  if (pathname.startsWith("/profile")) return "develop";
  return null;
}

type QuickAction = { label: string; href: string };

// Curated per role — deliberately short (the brief's own "do not dump every
// feature into a giant menu"), every href a real existing route.
function quickActionsForRole(role: string): QuickAction[] {
  if (role === "COACH") {
    return [
      { label: "Team", href: "/team" },
      { label: "Film Room", href: "/film" },
      { label: "Training", href: "/train" },
      { label: "Messages", href: "/messages" },
    ];
  }
  if (role === "TRAINER") {
    return [
      { label: "Groups", href: "/team" },
      { label: "Training", href: "/train" },
      { label: "Messages", href: "/messages" },
    ];
  }
  if (role === "PARENT") {
    return [
      { label: "Safety", href: "/safety" },
      { label: "Care", href: "/care" },
      { label: "Calendar", href: "/calendar" },
      { label: "Messages", href: "/messages" },
    ];
  }
  if (role === "DOCTOR") {
    return [
      { label: "Care Queue", href: "/care/provider" },
      { label: "Teams", href: "/team" },
      { label: "Messages", href: "/messages" },
    ];
  }
  return [
    { label: "Start Workout", href: "/train" },
    { label: "Performance", href: "/performance" },
    { label: "Film Room", href: "/film" },
    { label: "Academics", href: "/school" },
    { label: "Recruiting", href: "/recruit" },
    { label: "Athlete Profile", href: "/profile" },
  ];
}

const ASK_SUGGESTIONS = [
  { label: "Train", prompt: "What should I focus on today?" },
  { label: "Recruit", prompt: "What should I do next for recruiting?" },
  { label: "Recover", prompt: "How is my training load looking this week?" },
  { label: "School", prompt: "What academic deadlines should I know about?" },
  { label: "Film", prompt: "What film do I still need to review?" },
];

type AskState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "reply"; reply: string }
  | { status: "not-configured"; envVar?: string }
  | { status: "error"; message: string };

/**
 * The MENTA Island — a small, always-present command center living above
 * the existing AppShell chrome (sidebar/topbar/bottom nav are all
 * untouched; this is an additional floating layer, not a replacement for
 * page-to-page navigation). Deliberately dark glass regardless of the
 * light authenticated app underneath it — same reasoning Apple's own
 * Dynamic Island stays black no matter what app is open: it reads as a
 * distinct system layer, not page chrome.
 *
 * Data: fetched once client-side from /api/island (src/lib/island.ts) —
 * real getMyDay()/getAthleteSignals() data, never fabricated. Returns
 * null for non-athlete roles; those roles get the plain capsule + quick
 * actions + Ask MENTA, no Pulse/Next Move/Journey (those pillars are
 * athlete-specific).
 *
 * Ask MENTA reuses the exact same /api/ai endpoint and AIConversation
 * model AiChat.tsx/the /ai-coach page already use — not a second AI
 * system. This replaces the old standalone floating "Ask MENTA" button
 * (src/components/AskMenta.tsx, now unmounted but left in place) so
 * there's one AI entry point, not two.
 */
export function MENTAIsland({
  user,
  unreadCount,
}: {
  user: { id: string; name: string; role: string };
  unreadCount: number;
}) {
  const pathname = usePathname();

  const [state, setState] = useState<IslandState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [asking, setAsking] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [askDraft, setAskDraft] = useState("");
  const [askState, setAskState] = useState<AskState>({ status: "idle" });
  const [signal, setSignal] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUnreadRef = useRef<number | null>(null);

  // Real data only — one fetch on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/island")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setState(data.state ?? null);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ghost mode: shrink after real inactivity, wake on any interaction.
  // Never runs while the panel is open — an open panel is never idle.
  function wake() {
    setGhost(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (open) return;
    idleTimerRef.current = setTimeout(() => setGhost(true), GHOST_IDLE_MS);
  }

  useEffect(() => {
    // Deferred a tick rather than called directly in the effect body (same
    // reasoning as IntroBoot.tsx's own startTimer) — this only arms the
    // idle timer; ghost already starts false via useState, so this isn't
    // fixing a visible flash, just keeping the effect itself free of a
    // synchronous setState call.
    const armTimer = setTimeout(() => wake(), 0);
    const el = rootRef.current;
    const onActivity = () => wake();
    window.addEventListener("scroll", onActivity, { passive: true });
    el?.addEventListener("pointerenter", onActivity);
    el?.addEventListener("focusin", onActivity);
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener("scroll", onActivity);
      el?.removeEventListener("pointerenter", onActivity);
      el?.removeEventListener("focusin", onActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Signals: reuses the real Notification unreadCount AppShell already
  // computes server-side per page load — a real increase since the last
  // page the athlete saw is a real, honest "something changed" event, not
  // an invented one. Shows a brief transient bubble, then returns to the
  // normal collapsed capsule on its own.
  useEffect(() => {
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadCount;
    if (prev === null || unreadCount <= prev || open) return;
    setSignal(unreadCount - prev === 1 ? "New notification" : `${unreadCount - prev} new notifications`);
    setGhost(false);
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    signalTimerRef.current = setTimeout(() => setSignal(null), 5000);
    return () => {
      if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    };
  }, [unreadCount, open]);

  // Escape closes; outside click closes; body scroll stays enabled (the
  // panel is a bounded bubble, not a full-screen takeover) except on
  // small screens where it behaves like a sheet.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    // Closing the panel on every navigation keeps it from staying open
    // over a page the athlete didn't open it for. Deferred a tick, same
    // reasoning as the idle-timer effect above.
    const timer = setTimeout(() => {
      setOpen(false);
      setAsking(false);
      setWhyOpen(false);
      setAskState({ status: "idle" });
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  async function submitAsk(e: React.FormEvent) {
    e.preventDefault();
    const message = askDraft.trim();
    if (!message || askState.status === "sending") return;
    setAskState({ status: "sending" });
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAskState({ status: "error", message: data?.error ?? "Something went wrong." });
        return;
      }
      if (data.configured === false) {
        setAskState({ status: "not-configured" });
        return;
      }
      setAskState({ status: "reply", reply: data.reply });
    } catch {
      setAskState({ status: "error", message: "Network error. Try again." });
    }
  }

  const journeyKey = journeyKeyForPath(pathname);
  const isAthlete = user.role === "ATHLETE";
  const liveSession = state?.pulse.find((p) => p.key === "training" && p.value === "Live now");
  const quickActions = quickActionsForRole(user.role);

  let capsuleLabel = "MENTA";
  if (isAthlete && liveSession) capsuleLabel = "MENTA  ·  LIVE TRAINING";
  else if (isAthlete && journeyKey) {
    const stage = JOURNEY.find((j) => j.key === journeyKey);
    if (stage) capsuleLabel = `MENTA  ·  ${stage.label.toUpperCase()}`;
  } else if (isAthlete && state && state.todayCount > 0) {
    capsuleLabel = `MENTA  ·  ${state.todayCount} TODAY`;
  }

  function toggleOpen() {
    setOpen((o) => !o);
    setGhost(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }

  return (
    <div
      ref={rootRef}
      className={`menta-island${ghost ? " menta-island-ghost" : ""}${open ? " menta-island-open" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="menta-island-capsule"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="menta-island-panel"
        aria-label={open ? "Close MENTA command center" : "Open MENTA command center"}
      >
        <span className="menta-island-dot" aria-hidden="true" />
        <span className="menta-island-label">
          {signal ? signal : capsuleLabel}
        </span>
      </button>

      <div
        id="menta-island-panel"
        role="dialog"
        aria-label="MENTA command center"
        aria-hidden={!open}
        className={`menta-island-panel${open ? " menta-island-panel-open" : ""}`}
      >
          {isAthlete && (
            <nav className="menta-island-journey" aria-label="Athlete journey">
              {JOURNEY.map((stage) => {
                const active = stage.key === journeyKey;
                return (
                  <Link
                    key={stage.key}
                    href={stage.href}
                    aria-current={active ? "page" : undefined}
                    className={`menta-island-journey-stage${active ? " active" : ""}`}
                  >
                    {stage.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {isAthlete && loaded && state?.nextMove && (
            <div className="menta-island-section">
              <div className="menta-island-eyebrow">Next move</div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="menta-island-next-move-title">{state.nextMove.title}</div>
                  <button
                    type="button"
                    className="menta-island-why"
                    onClick={() => setWhyOpen((w) => !w)}
                    aria-expanded={whyOpen}
                  >
                    {whyOpen ? "Hide why" : "Why?"}
                  </button>
                  {whyOpen && <p className="menta-island-why-text">{state.nextMove.why}</p>}
                </div>
                <Link href={state.nextMove.href} className="menta-island-chip-btn shrink-0">
                  {state.nextMove.actionLabel} →
                </Link>
              </div>
            </div>
          )}

          {isAthlete && loaded && state && state.pulse.length > 0 && (
            <div className="menta-island-section">
              <div className="menta-island-eyebrow">MENTA Pulse</div>
              <div className="space-y-1.5">
                {state.pulse.map((row) => (
                  <Link key={row.key} href={row.href} className="menta-island-pulse-row">
                    <span className="text-text-3">{row.label}</span>
                    <span>{row.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="menta-island-section">
            <div className="menta-island-eyebrow">Ask MENTA</div>
            {!asking ? (
              <>
                <div className="menta-island-suggestions">
                  {ASK_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      className="menta-island-chip"
                      onClick={() => {
                        setAsking(true);
                        setAskDraft(s.prompt);
                        setTimeout(() => askInputRef.current?.focus(), 0);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="menta-island-ask-trigger"
                  onClick={() => {
                    setAsking(true);
                    setTimeout(() => askInputRef.current?.focus(), 0);
                  }}
                >
                  Ask MENTA anything…
                </button>
              </>
            ) : askState.status === "reply" ? (
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">{askState.reply}</p>
                <Link href="/ai-coach" className="menta-island-chip-btn inline-flex">
                  Continue in AI Coach →
                </Link>
              </div>
            ) : askState.status === "not-configured" ? (
              <p className="text-text-3 text-sm">MENTA AI isn&rsquo;t connected yet.</p>
            ) : (
              <form onSubmit={submitAsk} className="space-y-2">
                <input
                  ref={askInputRef}
                  className="menta-island-input"
                  placeholder="What should I do today?"
                  value={askDraft}
                  onChange={(e) => setAskDraft(e.target.value)}
                  disabled={askState.status === "sending"}
                />
                {askState.status === "error" && (
                  <p className="text-xs" style={{ color: "var(--danger)" }}>{askState.message}</p>
                )}
                <button
                  type="submit"
                  disabled={askState.status === "sending" || !askDraft.trim()}
                  className="menta-island-chip-btn w-full justify-center"
                >
                  {askState.status === "sending" ? "Asking…" : "Ask"}
                </button>
              </form>
            )}
          </div>

          <div className="menta-island-section">
            <div className="menta-island-eyebrow">Quick actions</div>
            <div className="menta-island-actions">
              {quickActions.map((a) => {
                // Same "current route" match AppShell's own sidebar already
                // uses for its active state, so the two stay consistent.
                const active = pathname === a.href || pathname.startsWith(a.href + "/");
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    aria-current={active ? "page" : undefined}
                    className={`menta-island-action${active ? " active" : ""}`}
                  >
                    {a.label}
                  </Link>
                );
              })}
            </div>
          </div>
      </div>
    </div>
  );
}
