"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKOUT_CATEGORIES } from "@/lib/sports";
import { WorkoutGenerator } from "@/components/WorkoutGenerator";

type Exercise = { name: string; sets?: string; reps?: string; notes?: string };

type WorkoutItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  exercises: Exercise[];
  teamId?: string | null;
  teamName: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  isTemplate?: boolean;
  canManage?: boolean;
  isPlanWorkout: boolean;
  yourCompletions: number;
  lastCompletedAt: string | null;
};

type Roster = Record<string, { id: string; name: string }[]>;

const CATEGORIES = WORKOUT_CATEGORIES;

export function TrainingView({
  initialWorkouts,
  manageableTeams,
  rosterByTeam,
  defaultSport,
  defaultPosition,
  defaultTrainingDaysPerWeek,
}: {
  initialWorkouts: WorkoutItem[];
  manageableTeams: { id: string; name: string }[];
  rosterByTeam: Roster;
  defaultSport?: string | null;
  defaultPosition?: string | null;
  defaultTrainingDaysPerWeek?: number | null;
}) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [filter, setFilter] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [mode, setMode] = useState<"none" | "generator" | "manual">("none");
  const [editing, setEditing] = useState<WorkoutItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = workouts.filter((w) => Boolean(w.isTemplate) === showTemplates);
  const filtered = filter ? visible.filter((w) => w.category === filter) : visible;

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

  async function deleteWorkout(id: string) {
    if (!confirm("Delete this workout? This can't be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkouts((ws) => ws.filter((w) => w.id !== id));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateWorkout(w: WorkoutItem) {
    setBusyId(w.id);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: w.isTemplate ? w.title : `Copy of ${w.title}`,
          category: w.category,
          description: w.description || undefined,
          exercises: w.exercises.length ? w.exercises : undefined,
          teamId: w.isTemplate ? undefined : w.teamId || undefined,
          assignedToId: w.isTemplate ? undefined : w.assignedToId || undefined,
          isTemplate: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWorkouts((ws) => [
          {
            id: data.workout.id,
            title: data.workout.title,
            category: data.workout.category,
            description: data.workout.description,
            exercises: w.exercises,
            teamId: data.workout.teamId,
            teamName: w.isTemplate ? null : w.teamName,
            assignedToId: data.workout.assignedToId,
            assignedToName: w.isTemplate ? null : w.assignedToName,
            isTemplate: false,
            canManage: true,
            isPlanWorkout: false,
            yourCompletions: 0,
            lastCompletedAt: null,
          },
          ...ws,
        ]);
        setShowTemplates(false);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setShowTemplates(false)}
            className="badge"
            style={{ cursor: "pointer", opacity: !showTemplates ? 1 : 0.5 }}
          >
            Workouts
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="badge"
            style={{ cursor: "pointer", opacity: showTemplates ? 1 : 0.5 }}
          >
            Templates
          </button>
          <span style={{ width: 1, height: 16, background: "var(--border)" }} />
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
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setMode(mode === "none" ? "generator" : "none");
          }}
        >
          {mode === "none" ? "Add workout" : "Cancel"}
        </button>
      </div>

      {mode === "generator" && (
        <WorkoutGenerator
          defaultSport={defaultSport}
          defaultPosition={defaultPosition}
          defaultTrainingDaysPerWeek={defaultTrainingDaysPerWeek}
          manageableTeams={manageableTeams}
          rosterByTeam={rosterByTeam}
          onSwitchToManual={() => setMode("manual")}
          onCreated={(w) => {
            setWorkouts((ws) => [w, ...ws]);
            setMode("none");
            router.refresh();
          }}
        />
      )}

      {mode === "manual" && (
        <WorkoutForm
          manageableTeams={manageableTeams}
          rosterByTeam={rosterByTeam}
          editing={editing}
          onSwitchToGenerator={editing ? undefined : () => setMode("generator")}
          onCancel={() => {
            setMode("none");
            setEditing(null);
          }}
          onSaved={(w, isNew) => {
            setWorkouts((ws) => (isNew ? [w, ...ws] : ws.map((existing) => (existing.id === w.id ? w : existing))));
            setMode("none");
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="card p-6">
          <p className="text-text-2 text-sm">
            {showTemplates ? "No templates saved yet." : "No workouts yet. Add one to start your library."}
          </p>
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
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="badge">{w.category}</span>
                    {w.teamName && !w.isTemplate && <span className="badge">{w.teamName}</span>}
                    {w.assignedToName && <span className="badge">For {w.assignedToName}</span>}
                    {w.isPlanWorkout && <span className="badge badge-live">Your plan</span>}
                    {w.isTemplate && <span className="badge">Template</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {w.isTemplate ? (
                    <button disabled={busyId === w.id} onClick={() => duplicateWorkout(w)} className="btn-secondary">
                      {busyId === w.id ? "Working…" : "Use template"}
                    </button>
                  ) : (
                    <button disabled={busyId === w.id} onClick={() => logCompletion(w.id)} className="btn-secondary">
                      Mark complete
                    </button>
                  )}
                  {w.canManage && (
                    <div className="relative group">
                      <button
                        type="button"
                        className="text-text-3 hover:text-text-1 px-1"
                        aria-label="Workout actions"
                        onClick={() => setExpanded(expanded === `menu-${w.id}` ? null : `menu-${w.id}`)}
                      >
                        ⋯
                      </button>
                      {expanded === `menu-${w.id}` && (
                        <div
                          className="absolute right-0 mt-1 card p-1"
                          style={{ zIndex: 10, minWidth: 140 }}
                        >
                          <button
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--nav-hover-bg)] rounded-[var(--r-sm)]"
                            onClick={() => {
                              setEditing(w);
                              setMode("manual");
                              setExpanded(null);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--nav-hover-bg)] rounded-[var(--r-sm)]"
                            onClick={() => {
                              setExpanded(null);
                              duplicateWorkout(w);
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--nav-hover-bg)] rounded-[var(--r-sm)]"
                            style={{ color: "var(--danger)" }}
                            onClick={() => {
                              setExpanded(null);
                              deleteWorkout(w.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

/** Native HTML5 drag-and-drop reorder — no extra dependency for a list this small. */
function ExerciseEditor({ exercises, onChange }: { exercises: Exercise[]; onChange: (next: Exercise[]) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("");
  const [exReps, setExReps] = useState("");

  function addExercise() {
    if (!exName.trim()) return;
    onChange([...exercises, { name: exName.trim(), sets: exSets || undefined, reps: exReps || undefined }]);
    setExName("");
    setExSets("");
    setExReps("");
  }

  function removeExercise(i: number) {
    onChange(exercises.filter((_, idx) => idx !== i));
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...exercises];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <div className="field-label">Exercises (optional) — drag to reorder</div>
      <div className="flex gap-2 mb-2">
        <input className="field-input" placeholder="Exercise" value={exName} onChange={(e) => setExName(e.target.value)} />
        <input className="field-input w-20" placeholder="Sets" value={exSets} onChange={(e) => setExSets(e.target.value)} />
        <input className="field-input w-20" placeholder="Reps" value={exReps} onChange={(e) => setExReps(e.target.value)} />
        <button type="button" onClick={addExercise} className="btn-secondary shrink-0">Add</button>
      </div>
      {exercises.length > 0 && (
        <ul className="space-y-1">
          {exercises.map((ex, i) => (
            <li
              key={i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) reorder(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className="flex items-center justify-between text-sm text-text-2 px-2 py-1.5 rounded-[var(--r-sm)]"
              style={{ background: "var(--surface-2)", cursor: "grab", opacity: dragIndex === i ? 0.4 : 1 }}
            >
              <span className="flex items-center gap-2">
                <span className="text-text-3" aria-hidden="true">⋮⋮</span>
                {ex.name}
                <span className="text-text-3">
                  {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button type="button" onClick={() => removeExercise(i)} className="text-text-3 hover:text-text-1">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkoutForm({
  manageableTeams,
  rosterByTeam,
  editing,
  onSaved,
  onCancel,
  onSwitchToGenerator,
}: {
  manageableTeams: { id: string; name: string }[];
  rosterByTeam: Roster;
  editing: WorkoutItem | null;
  onSaved: (w: WorkoutItem, isNew: boolean) => void;
  onCancel: () => void;
  onSwitchToGenerator?: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES[0]);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [teamId, setTeamId] = useState(editing?.teamId ?? "");
  const [assignedToId, setAssignedToId] = useState(editing?.assignedToId ?? "");
  const [isTemplate, setIsTemplate] = useState(editing?.isTemplate ?? false);
  const [exercises, setExercises] = useState<Exercise[]>(editing?.exercises ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roster = teamId ? rosterByTeam[teamId] ?? [] : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = {
        title,
        category,
        description: description || undefined,
        teamId: isTemplate ? undefined : teamId || undefined,
        assignedToId: isTemplate ? undefined : assignedToId || undefined,
        isTemplate,
        exercises: exercises.length ? exercises : undefined,
      };
      const res = await fetch(editing ? `/api/workouts/${editing.id}` : "/api/workouts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save workout.");
        return;
      }
      const assignedName = assignedToId ? roster.find((r) => r.id === assignedToId)?.name ?? null : null;
      onSaved(
        {
          id: data.workout.id,
          title: data.workout.title,
          category: data.workout.category,
          description: data.workout.description,
          exercises,
          teamId: data.workout.teamId,
          teamName: isTemplate ? null : manageableTeams.find((t) => t.id === teamId)?.name ?? editing?.teamName ?? null,
          assignedToId: data.workout.assignedToId,
          assignedToName: isTemplate ? null : assignedName ?? editing?.assignedToName ?? null,
          isTemplate: data.workout.isTemplate,
          canManage: true,
          isPlanWorkout: editing?.isPlanWorkout ?? false,
          yourCompletions: editing?.yourCompletions ?? 0,
          lastCompletedAt: editing?.lastCompletedAt ?? null,
        },
        !editing
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
      <div className="flex items-center justify-between">
        {onSwitchToGenerator ? (
          <button type="button" onClick={onSwitchToGenerator} className="text-xs text-text-2 hover:text-text-1">
            ← Use the workout generator instead
          </button>
        ) : <span />}
        <button type="button" onClick={onCancel} className="text-xs text-text-2 hover:text-text-1">
          {editing ? "Cancel edit" : "Cancel"}
        </button>
      </div>
      <input className="field-input" placeholder="Workout title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {manageableTeams.length > 0 && !isTemplate ? (
          <select
            className="field-select"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setAssignedToId("");
            }}
          >
            <option value="">Personal</option>
            {manageableTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name} (team)</option>
            ))}
          </select>
        ) : (
          <div />
        )}
      </div>

      {teamId && !isTemplate && roster.length > 0 && (
        <select className="field-select" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
          <option value="">Whole team</option>
          {roster.map((r) => (
            <option key={r.id} value={r.id}>Just {r.name}</option>
          ))}
        </select>
      )}

      <textarea className="field-textarea" rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

      <ExerciseEditor exercises={exercises} onChange={setExercises} />

      {manageableTeams.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} />
          Save as a reusable template instead of a live workout
        </label>
      )}

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : editing ? "Save changes" : "Save workout"}
      </button>
    </form>
  );
}
