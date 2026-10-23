"use client";

import { useState } from "react";
import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";

export type SubjectQueueEvidence = { label: string; value: string };
export type SubjectQueueOutcome = { status: string; detail: string };
export type SubjectQueueHistoryItem = {
  id: string;
  kind: string;
  athleteName: string;
  title: string;
  outcome?: SubjectQueueOutcome;
};
export type SubjectQueueItemData = {
  id: string;
  kind: string;
  athleteId: string;
  athleteName: string;
  title: string;
  reasoning: string;
  evidence: SubjectQueueEvidence[];
  actionHref: string;
};

const OUTCOME_LABEL: Record<string, string> = {
  IMPROVED: "Improved",
  DECLINED: "Changed",
  NEW_DATA: "New data logged",
  COMPLETED_ONLY: "Completed",
  INSUFFICIENT_DATA: "Not enough data yet",
};

/**
 * Shared Next Move queue for any non-athlete viewer watching multiple
 * athletes — Coach today, Parent (households with multiple linked
 * athletes included — this list was already multi-subject by design)
 * joining it here, and the same component is meant to serve
 * Trainer/Educator/Administrator/Organization next. Same engine as the
 * athlete dashboard's NextMoveCard, scoped to whatever that viewer is
 * actually authorized to see. The history below keeps the same honest
 * completed-vs-improved distinction as the athlete side — never inferred,
 * only what the underlying records show.
 */
export function SubjectNextMoveQueue({
  initialQueue,
  initialHistory,
  apiEndpoint,
  kindLabels,
  emptyHeadline,
  emptyBody,
}: {
  initialQueue: SubjectQueueItemData[];
  initialHistory: SubjectQueueHistoryItem[];
  /** Which API route to POST accept/dismiss actions to — the viewer-specific queue endpoint. */
  apiEndpoint: string;
  /** Short badge label per recommendation kind, e.g. { FILM_ASSIGNMENT_OVERDUE: "Film" }. */
  kindLabels: Record<string, string>;
  /** Shown when the queue is empty — phrase for the specific viewer ("Your roster", "Your household", ...). */
  emptyHeadline: string;
  emptyBody: string;
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [history] = useState(initialHistory);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  function acceptPing(id: string) {
    // Fire-and-forget: the link navigates immediately either way. Records
    // "recommendation accepted" only from this real click, never inferred.
    fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "accept" }),
      keepalive: true,
    }).catch(() => {});
  }

  async function dismiss(id: string) {
    setDismissingId(id);
    try {
      const res = await fetch(apiEndpoint, {
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
      <div className="card glass-signal-card p-6 sm:p-8 mb-4">
        <div className="mono text-text-3 mb-3">Needs your attention</div>
        {!top ? (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              <GlowWaveText intensity="strong">{emptyHeadline}</GlowWaveText>
            </h2>
            <p className="text-text-2 text-sm">{emptyBody}</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge">{kindLabels[top.kind] ?? top.kind}</span>
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
              <Link href={top.actionHref} className="btn-primary" onClick={() => acceptPing(top.id)}>
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
                <Link
                  href={item.actionHref}
                  className="hover:text-text-2 transition-colors min-w-0"
                  onClick={() => acceptPing(item.id)}
                >
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

      {history.length > 0 && (
        <details className="card p-4 mt-3">
          <summary className="mono text-text-3 text-xs cursor-pointer select-none">
            Recently resolved ({history.length})
          </summary>
          <ul className="space-y-2 mt-3 text-sm">
            {history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-text-3">{item.athleteName}</span> — {item.title}
                </span>
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
