"use client";

import { useState } from "react";
import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";

export type NextMoveEvidence = { label: string; value: string };
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

/**
 * MENTA's signature experience: the one next action computed across every
 * domain the athlete uses, with the real evidence that produced it. Not a
 * static tip — this clears itself the moment the underlying data shows the
 * athlete actually did it, and a fresh GET /api/next-move immediately picks
 * the next real thing worth doing.
 */
export function NextMoveCard({ initial }: { initial: NextMoveData }) {
  const [current, setCurrent] = useState(initial);
  const [dismissing, setDismissing] = useState(false);
  const [justCleared, setJustCleared] = useState(false);

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
        setTimeout(() => setJustCleared(false), 400);
      }
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div
      className="card p-6 sm:p-8 mb-8"
      style={{
        border: "1px solid transparent",
        backgroundImage: "linear-gradient(var(--surface), var(--surface)), var(--grad-signal)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
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
          <p className="text-text-2 text-sm mb-4 max-w-2xl">{current.reasoning}</p>

          {current.evidence.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {current.evidence.map((e, i) => (
                <span key={i} className="badge">
                  {e.label}: {e.value}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link href={current.actionHref} className="btn-primary">
              Act on this
            </Link>
            <button type="button" className="text-xs text-text-3 hover:text-text-1" disabled={dismissing} onClick={dismiss}>
              {dismissing ? "…" : "Not right now"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
