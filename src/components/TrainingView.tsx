"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKOUT_CATEGORIES } from "@/lib/sports";

type Exercise = { name: string; sets?: string; reps?: string; notes?: string };

type WorkoutItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  exercises: Exercise[];
  teamName: string | null;
  isPlanWorkout: boolean;
  yourCompletions: number;
  lastCompletedAt: string | null;
};

const CATEGORIES = WORKOUT_CATEGORIES;

export function TrainingView({
  initialWorkouts,
  manageableTeams,
}: {
  initialWorkouts: WorkoutItem[];
  manageableTeams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [filter, setFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter ? workouts.filter((w) => w.category === filter) : workouts;

  async function logCompletion(id: string) {
    const res = await fetch(`/api/workouts/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setWorkouts((ws) =>
        ws.map((w) =>
          w.id === id
            ? { ...w, yourCompletions: w.yourCompletions + 1, lastCompletedAt: new Date().toISOString() }
            : w
        )
      );
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className="badge"
            style={{ cursor: "pointer", opacity: filter === null ? 1 : 0.5 }}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="badge"
              style={{ cursor: "pointer", opacity: filter === c ? 1 : 0.5 }}
            >
              {c}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add workout"}
        </button>
      </div>

      {showForm && (
        <WorkoutForm
          manageableTeams={manageableTeams}
          onCreated={(w) => {
            setWorkouts((ws) => [w, ...ws]);
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="card p-6">
          <p className="text-text-2 text-sm">No workouts yet. Add one to start your library.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((w) => (
            <li key={w.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <button className="text-left" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
                    <div className="font-medium">{w.title}</div>
                  </button>
                  <div className="flex gap-2 mt-1">
                    <span className="badge">{w.category}</span>
                    {w.teamName && <span className="badge">{w.teamName}</span>}
                    {w.isPlanWorkout && <span className="badge badge-live">Your plan</span>}
                  </div>
                </div>
                <button onClick={() => logCompletion(w.id)} className="btn-secondary shrink-0">
                  Mark complete
                </button>
              </div>

              {w.yourCompletions > 0 && (
                <p className="mono text-text-3 mt-3">
                  Done {w.yourCompletions}× — last{" "}
                  {w.lastCompletedAt ? new Date(w.lastCompletedAt).toLocaleDateString() : "—"}
                </p>
              )}

              {expanded === w.id && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                  {w.description && <p className="text-text-2 text-sm">{w.description}</p>}
                  {w.exercises.length > 0 && (
                    <ul className="space-y-1.5 text-sm">
                      {w.exercises.map((ex, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{ex.name}</span>
                          <span className="text-text-3">
                            {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkoutForm({
  manageableTeams,
  onCreated,
}: {
  manageableTeams: { id: string; name: string }[];
  onCreated: (w: WorkoutItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("");
  const [exReps, setExReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addExercise() {
    if (!exName.trim()) return;
    setExercises((ex) => [...ex, { name: exName.trim(), sets: exSets || undefined, reps: exReps || undefined }]);
    setExName("");
    setExSets("");
    setExReps("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          description: description || undefined,
          teamId: teamId || undefined,
          exercises: exercises.length ? exercises : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create workout.");
        return;
      }
      onCreated({
        id: data.workout.id,
        title: data.workout.title,
        category: data.workout.category,
        description: data.workout.description,
        exercises,
        teamName: manageableTeams.find((t) => t.id === teamId)?.name ?? null,
        isPlanWorkout: false,
        yourCompletions: 0,
        lastCompletedAt: null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
      <input className="field-input" placeholder="Workout title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {manageableTeams.length > 0 ? (
          <select className="field-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Personal</option>
            {manageableTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name} (team)</option>
            ))}
          </select>
        ) : (
          <div />
        )}
      </div>
      <textarea className="field-textarea" rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

      <div>
        <div className="field-label">Exercises (optional)</div>
        <div className="flex gap-2 mb-2">
          <input className="field-input" placeholder="Exercise" value={exName} onChange={(e) => setExName(e.target.value)} />
          <input className="field-input w-20" placeholder="Sets" value={exSets} onChange={(e) => setExSets(e.target.value)} />
          <input className="field-input w-20" placeholder="Reps" value={exReps} onChange={(e) => setExReps(e.target.value)} />
          <button type="button" onClick={addExercise} className="btn-secondary shrink-0">Add</button>
        </div>
        {exercises.length > 0 && (
          <ul className="space-y-1 text-sm">
            {exercises.map((ex, i) => (
              <li key={i} className="flex justify-between text-text-2">
                <span>{ex.name}</span>
                <span>{[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Save workout"}
      </button>
    </form>
  );
}
