"use client";

import { useState } from "react";
import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";

export type CoachQueueEvidence = { label: string; value: string };
export type CoachQueueItemData = {
  id: string;
  kind: string;
  athleteId: string;
  athleteName: string;
  title: string;
  reasoning: string;
  evidence: CoachQueueEvidence[];
  actionHref: string;
};

const KIND_LABEL: Record<string, string> = {
  FILM_ASSIGNMENT_OVERDUE: "Film",
  FILM_REVIEW_UNANSWERED: "Film question",
};

/**
 * Coach-side Next Move — the same engine as the athlete dashboard's
 * NextMoveCard, scoped to what a coach is actually authorized to see
 * (film assignments the team assigned, film questions directed at the
 * team's coaches). Answers "which athlete needs my attention most right
 * now" with the top item emphasized and the rest as a compact queue.
 */
export function CoachNextMoveQueue({ initialQueue }: { initialQueue: CoachQueueItemData[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  async function dismiss(id: string) {
    setDismissingId(id);
    try {
      const res = await fetch("/api/coach-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "dismiss" }),
      });
      if (res.ok) setQueue((q) => q.filter((item) => item.id !== id));
    } finally {
      setDismissingId(null);
    }
  }

  const [top, ...rest] = queue;

  return (
    <div className="mb-8">
      <div
        className="card p-6 sm:p-8 mb-4"
        style={{
          border: "1px solid transparent",
          backgroundImage: "linear-gradient(var(--surface), var(--surface)), var(--grad-signal)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        <div className="mono text-text-3 mb-3">Needs your attention</div>
        {!top ? (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              <GlowWaveText intensity="strong">Your roster is caught up.</GlowWaveText>
            </h2>
            <p className="text-text-2 text-sm">
              No overdue film assignments and no unanswered film questions across your teams right
              now.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge">{KIND_LABEL[top.kind] ?? top.kind}</span>
              <span className="text-xs text-text-3">{top.athleteName}</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              <GlowWaveText intensity="strong">{top.title}</GlowWaveText>
            </h2>
            <p className="text-text-2 text-sm mb-4 max-w-2xl">{top.reasoning}</p>
            {top.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {top.evidence.map((e, i) => (
                  <span key={i} className="badge">
                    {e.label}: {e.value}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Link href={top.actionHref} className="btn-primary">
                Open
              </Link>
              <button
                type="button"
                className="text-xs text-text-3 hover:text-text-1"
                disabled={dismissingId === top.id}
                onClick={() => dismiss(top.id)}
              >
                {dismissingId === top.id ? "…" : "Not right now"}
              </button>
            </div>
          </>
        )}
      </div>

      {rest.length > 0 && (
        <div className="card p-5">
          <div className="mono text-text-3 mb-3">Also waiting ({rest.length})</div>
          <ul className="space-y-2 text-sm">
            {rest.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <Link href={item.actionHref} className="hover:text-text-2 transition-colors min-w-0">
                  <span className="text-text-3">{item.athleteName}</span> — {item.title}
                </Link>
                <button
                  type="button"
                  className="text-xs text-text-3 hover:text-text-1 shrink-0"
                  disabled={dismissingId === item.id}
                  onClick={() => dismiss(item.id)}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
