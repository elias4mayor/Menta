"use client";

import { useState } from "react";

export type FilmAssignmentBannerTarget = {
  assignmentId: string;
  status: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  requiredViewing: boolean;
};

/**
 * The completion control for a film assignment, shown directly on the film
 * the athlete is watching — not a second screen away. Reuses the exact same
 * /api/assignments/[id]/targets/me endpoint as the /assignments page
 * (AssignmentsList.tsx), which is already scoped to the caller's own
 * FilmAssignmentTarget row (assignmentId_userId), so this can never
 * complete another athlete's assignment. No new completion system.
 */
export function FilmAssignmentBanner({ initialTargets }: { initialTargets: FilmAssignmentBannerTarget[] }) {
  const [targets, setTargets] = useState(initialTargets);
  const [now] = useState(() => Date.now());

  async function markStatus(assignmentId: string, status: string) {
    setTargets((t) => t.map((x) => (x.assignmentId === assignmentId ? { ...x, status } : x)));
    await fetch(`/api/assignments/${assignmentId}/targets/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const active = targets.filter((t) => t.status !== "COMPLETED");
  if (active.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {active.map((t) => {
        const overdue = t.dueAt && new Date(t.dueAt).getTime() < now;
        return (
          <div
            key={t.assignmentId}
            className="card p-4"
            style={{
              border: "1px solid transparent",
              backgroundImage: "linear-gradient(var(--surface), var(--surface)), var(--grad-signal)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="font-medium text-sm">Your coach assigned this film: {t.title}</div>
              <span className="badge" style={{ color: overdue ? "var(--danger)" : undefined }}>
                {t.status}
                {t.dueAt && ` · due ${new Date(t.dueAt).toLocaleDateString()}`}
                {t.requiredViewing && " · required"}
              </span>
            </div>
            {t.instructions && <p className="text-text-2 text-sm mb-2">{t.instructions}</p>}
            <div className="flex gap-2 mt-2">
              {t.status !== "WATCHED" && (
                <button className="btn-secondary" onClick={() => markStatus(t.assignmentId, "WATCHED")}>
                  Mark watched
                </button>
              )}
              <button className="btn-primary" onClick={() => markStatus(t.assignmentId, "COMPLETED")}>
                Mark complete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
