"use client";

import { useState } from "react";
import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";

export type NextMoveEvidence = { label: string; value: string };
export type NextMoveOutcome = { status: string; detail: string };
export type NextMoveHistoryItem = {
  id: string;
  kind: string;
  title: string;
  outcome?: NextMoveOutcome;
};
export type NextMoveData = {
  id: string;
  kind: string;
  title: string;
  reasoning: string;
  evidence: NextMoveEvidence[];
  actionHref: string;
} | null;

const KIND_LABEL: Record<string, string> = {
  GOAL_STALE: "Goals",
  TRAINING_GAP: "Training",
  PERFORMANCE_STALE: "Performance",
  FILM_ASSIGNMENT_OVERDUE: "Film",
  ACADEMIC_OVERDUE: "Academics",
  ELIGIBILITY_INCOMPLETE: "Eligibility",
  RECRUITING_STALE: "Recruiting",
};

const OUTCOME_LABEL: Record<string, string> = {
  IMPROVED: "Improved",
  DECLINED: "Changed",
  NEW_DATA: "New data logged",
  COMPLETED_ONLY: "Completed",
  INSUFFICIENT_DATA: "Not enough data yet",
};

/**
 * MENTA's signature experience: the one next action computed across every
 * domain the athlete uses, with the real evidence that produced it. Not a
 * static tip — this clears itself the moment the underlying data shows the
 * athlete actually did it, and a fresh GET /api/next-move immediately picks
 * the next real thing worth doing. The history below is the other half of
 * that promise: what happened after, stated honestly — "completed" is
 * never confused with "improved."
 */
export function NextMoveCard({
  initial,
  initialCompetingCount,
  initialHistory,
}: {
  initial: NextMoveData;
  initialCompetingCount: number;
  initialHistory: NextMoveHistoryItem[];
}) {
  const [current, setCurrent] = useState(initial);
  const [competingCount, setCompetingCount] = useState(initialCompetingCount);
  const [history, setHistory] = useState(initialHistory);
  const [dismissing, setDismissing] = useState(false);
  const [justCleared, setJustCleared] = useState(false);

  function acceptPing() {
    if (!current) return;
    // Fire-and-forget: the link navigates immediately either way. This is
    // the one real signal MENTA records for "recommendation accepted" —
    // never inferred from a page view, only this actual click.
    fetch("/api/next-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, action: "accept" }),
      keepalive: true,
    }).catch(() => {});
  }

  async function dismiss() {
    if (!current) return;
    setDismissing(true);
    try {
      const res = await fetch("/api/next-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, action: "dismiss" }),
      });
      if (res.ok) {
        setJustCleared(true);
        const next = await fetch("/api/next-move").then((r) => r.json());
        setCurrent(next.current ?? null);
        setCompetingCount(next.competingCount ?? 0);
        setHistory(next.recentlyResolved ?? []);
        setTimeout(() => setJustCleared(false), 400);
      }
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="mb-8">
      <div
        className="card glass-signal-card p-6 sm:p-8 mb-3"
        style={{
          opacity: justCleared ? 0.4 : 1,
          transition: "opacity 300ms ease",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Your next move</div>
          {current && <span className="badge">{KIND_LABEL[current.kind] ?? current.kind}</span>}
        </div>

        {!current ? (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              <GlowWaveText intensity="strong">You&rsquo;re caught up.</GlowWaveText>
            </h2>
            <p className="text-text-2 text-sm">
              Nothing overdue or stale across goals, training, performance, film, academics, or
              recruiting. Keep logging real activity and MENTA will surface the next thing that
              actually matters.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              <GlowWaveText intensity="strong">{current.title}</GlowWaveText>
            </h2>
            <p className="text-text-2 text-sm mb-1 max-w-2xl">{current.reasoning}</p>
            {competingCount > 0 && (
              <p className="text-text-3 text-xs mb-4">
                Chosen over {competingCount} other outstanding item{competingCount === 1 ? "" : "s"} across your goals,
                training, film, academics, and recruiting.
              </p>
            )}

            {current.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5 mt-3">
                {current.evidence.map((e, i) => (
                  <span key={i} className="badge">
                    {e.label}: {e.value}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Link href={current.actionHref} className="btn-primary" onClick={acceptPing}>
                Act on this
              </Link>
              <button type="button" className="text-xs text-text-3 hover:text-text-1" disabled={dismissing} onClick={dismiss}>
                {dismissing ? "…" : "Not right now"}
              </button>
            </div>
          </>
        )}
      </div>

      {history.length > 0 && (
        <details className="card p-4">
          <summary className="mono text-text-3 text-xs cursor-pointer select-none">
            Recently resolved ({history.length})
          </summary>
          <ul className="space-y-2 mt-3 text-sm">
            {history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">{item.title}</span>
                {item.outcome && (
                  <span className="text-right shrink-0">
                    <span className="badge">{OUTCOME_LABEL[item.outcome.status] ?? item.outcome.status}</span>
                    <div className="text-text-3 text-xs mt-1 max-w-[220px]">{item.outcome.detail}</div>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
