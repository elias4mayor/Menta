"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";

export type PlanWorkoutItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  exercises: { name: string; sets?: string; reps?: string }[];
  yourCompletions: number;
  lastCompletedAt: string | null;
};

/**
 * Real starter plan generated at onboarding (see src/lib/generate-plan.ts)
 * — every workout here is an actual Workout row the athlete can complete
 * from the real Training page too; this card is just a focused view of the
 * same data with its own "mark complete" action against the same API.
 */
export function PlanCard({
  workouts,
  developmentAreas,
  trainingNote,
  trainingDaysPerWeek,
  sport,
}: {
  workouts: PlanWorkoutItem[];
  developmentAreas: string[];
  trainingNote: string;
  trainingDaysPerWeek: number | null;
  sport: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(workouts);
  const [selectedId, setSelectedId] = useState(workouts[0]?.id ?? "");
  const [completing, setCompleting] = useState(false);

  const selected = useMemo(() => items.find((w) => w.id === selectedId) ?? items[0], [items, selectedId]);
  const startedCount = items.filter((w) => w.yourCompletions > 0).length;

  async function markComplete(id: string) {
    setCompleting(true);
    try {
      const res = await fetch(`/api/workouts/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((w) =>
            w.id === id ? { ...w, yourCompletions: w.yourCompletions + 1, lastCompletedAt: new Date().toISOString() } : w
          )
        );
        router.refresh();
      }
    } finally {
      setCompleting(false);
    }
  }

  if (!sport) {
    return (
      <div className="card p-5 mb-8">
        <div className="mono text-text-3 mb-3">Your plan</div>
        <p className="text-text-2 text-sm">Finish onboarding to generate your starter training plan.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-5 mb-8">
        <div className="mono text-text-3 mb-3">Your plan</div>
        <p className="text-text-2 text-sm">
          No plan workouts yet. Add one from your <Link href="/train" className="text-text-1 hover:underline">Training library</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3">Your plan</div>
        <span className="mono text-text-3 text-xs">
          {startedCount} / {items.length} started
        </span>
      </div>

      {developmentAreas.length > 0 && (
        <p className="text-sm mb-1 text-text-1">
          <span className="text-text-2">Development priority:</span> {developmentAreas.join(" · ")}
        </p>
      )}
      {trainingDaysPerWeek && (
        <p className="text-text-3 text-xs mb-3">Training {trainingDaysPerWeek} days/week, based on what you set at onboarding.</p>
      )}
      {trainingNote && <p className="text-text-2 text-sm mb-4">{trainingNote}</p>}

      <div className="mb-4">
        <label className="field-label" htmlFor="plan-workout-select">Workout</label>
        <Select
          id="plan-workout-select"
          value={selected?.id ?? ""}
          onChange={setSelectedId}
          options={items.map((w) => ({
            value: w.id,
            label: `${w.title}${w.yourCompletions > 0 ? ` (done ${w.yourCompletions}×)` : ""}`,
          }))}
        />
      </div>

      {selected && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge">{selected.category}</span>
            {selected.yourCompletions > 0 && (
              <span className="mono text-text-3 text-xs">
                Last done {selected.lastCompletedAt ? new Date(selected.lastCompletedAt).toLocaleDateString() : "—"}
              </span>
            )}
          </div>
          {selected.description && <p className="text-text-2 text-sm mb-3">{selected.description}</p>}
          {selected.exercises.length > 0 && (
            <ul className="space-y-1.5 text-sm mb-4">
              {selected.exercises.map((ex, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-text-1">{ex.name}</span>
                  <span className="text-text-3">
                    {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <button type="button" disabled={completing} onClick={() => markComplete(selected.id)} className="btn-primary">
              {completing ? "Saving…" : "Mark workout complete"}
            </button>
            <Link href="/train" className="text-xs text-text-2 hover:text-text-1">
              Full training library →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
