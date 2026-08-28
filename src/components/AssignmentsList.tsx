"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type Target = {
  id: string;
  assignmentId: string;
  status: string;
  comment: string | null;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  requiredViewing: boolean;
  filmId: string | null;
  filmTitle: string | null;
  playlistId: string | null;
  playlistTitle: string | null;
  clipLabel: string | null;
};

export function AssignmentsList({ initialTargets }: { initialTargets: Target[] }) {
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

  if (targets.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No assignments yet" description="Film your coach assigns you will show up here." />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {targets.map((t) => {
        const href = t.filmId ? `/film/${t.filmId}` : t.playlistId ? `/playlists/${t.playlistId}` : null;
        const overdue = t.dueAt && t.status !== "COMPLETED" && new Date(t.dueAt).getTime() < now;
        return (
          <li key={t.id} className="card p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="font-medium">{t.title}</div>
              <span className="badge" style={{ color: overdue ? "var(--danger)" : undefined }}>
                {t.status}
                {t.dueAt && ` · due ${new Date(t.dueAt).toLocaleDateString()}`}
              </span>
            </div>
            {t.instructions && <p className="text-text-2 text-sm mb-2">{t.instructions}</p>}
            {href && (
              <Link href={href} className="text-sm underline">
                {t.filmTitle ?? t.playlistTitle ?? t.clipLabel ?? "Open"} →
              </Link>
            )}
            <div className="flex gap-2 mt-3">
              {t.status !== "WATCHED" && t.status !== "COMPLETED" && (
                <button className="btn-secondary" onClick={() => markStatus(t.assignmentId, "WATCHED")}>
                  Mark watched
                </button>
              )}
              {t.status !== "COMPLETED" && (
                <button className="btn-primary" onClick={() => markStatus(t.assignmentId, "COMPLETED")}>
                  Mark complete
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
