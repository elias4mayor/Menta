"use client";

import { useEffect, useMemo, useState } from "react";

export type PickableExercise = {
  id: string;
  name: string;
  category: string;
  sport: string | null;
  isGlobal: boolean;
  teamName: string | null;
};

/**
 * Reuses Phase 3's existing /api/exercises list endpoint as-is — no new
 * exercise-search API for the builder. Fetched lazily on first open, not
 * on every ProgramBuilder mount, since a coach may never open the picker
 * in a given visit.
 */
export function ExercisePicker({ onSelect, onClose }: { onSelect: (exercise: PickableExercise) => void; onClose: () => void }) {
  const [exercises, setExercises] = useState<PickableExercise[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/exercises")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setExercises(data.exercises ?? []);
      })
      .catch(() => {
        if (!cancelled) setExercises([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const query = q.trim().toLowerCase();
    if (!query) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(query));
  }, [exercises, q]);

  return (
    <div className="card p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3 text-xs">Add exercise</div>
        <button className="text-xs text-text-2 hover:text-text-1" onClick={onClose}>
          Cancel
        </button>
      </div>
      <input
        className="field-input mb-3"
        placeholder="Search exercises…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      {exercises === null ? (
        <p className="text-text-3 text-xs">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-text-3 text-xs">No exercises match.</p>
      ) : (
        <ul className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="w-full flex items-center gap-2 p-2 rounded text-left hover:bg-[var(--surface-hover,rgba(0,0,0,0.03))]"
                onClick={() => onSelect(e)}
              >
                <span className="flex-1 truncate text-sm">{e.name}</span>
                <span className="badge shrink-0">{e.category}</span>
                <span className="mono text-text-3 text-xs shrink-0">{e.isGlobal ? "MENTA" : e.teamName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
