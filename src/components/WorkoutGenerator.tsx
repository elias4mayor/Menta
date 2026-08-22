"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/Select";
import { SPORTS, rolesForSport, roleLabel } from "@/lib/sports";
import {
  generateWorkout,
  GOALS,
  goalLabel,
  EXPERIENCE_LEVELS,
  INTENSITY_LEVELS,
  DURATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  type Equipment,
  type Experience,
  type Intensity,
  type Goal,
  type GeneratedWorkout,
  type Drill,
} from "@/lib/workout-generator";

type WorkoutItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  exercises: { name: string; sets?: string; reps?: string; notes?: string }[];
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

function combineNote(instructions: string, cue: string): string {
  const combined = `${instructions} Cue: ${cue}`;
  return combined.length <= 200 ? combined : `${combined.slice(0, 197)}…`;
}

function toExercises(section: Drill[], labelPrefix?: string) {
  return section.map((d) => ({
    name: labelPrefix ? `${labelPrefix}: ${d.name}` : d.name,
    reps: d.volume,
    notes: combineNote(d.instructions, d.cue),
  }));
}

/**
 * The MENTA Workout Generator: real inputs in, a structured, deterministic
 * workout out (src/lib/workout-generator.ts) — not a blank form and not an
 * AI hallucination. "Add to my training plan" saves it through the exact
 * same Workout model and /api/workouts route as the manual form and the
 * onboarding starter plan; there is no second workout system.
 */
export function WorkoutGenerator({
  defaultSport,
  defaultPosition,
  defaultTrainingDaysPerWeek,
  manageableTeams,
  rosterByTeam,
  onCreated,
  onSwitchToManual,
}: {
  defaultSport?: string | null;
  defaultPosition?: string | null;
  defaultTrainingDaysPerWeek?: number | null;
  manageableTeams: { id: string; name: string }[];
  rosterByTeam: Record<string, { id: string; name: string }[]>;
  onCreated: (w: WorkoutItem) => void;
  onSwitchToManual: () => void;
}) {
  const [sport, setSport] = useState(defaultSport ?? SPORTS[0].name);
  const [position, setPosition] = useState(defaultPosition ?? "");
  const [goal, setGoal] = useState<Goal>("SKILL");
  const [experience, setExperience] = useState<Experience>("Intermediate");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [duration, setDuration] = useState<number>(30);
  const [intensity, setIntensity] = useState<Intensity>("Moderate");
  const [teamId, setTeamId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedWorkout | null>(null);

  const roster = teamId ? rosterByTeam[teamId] ?? [] : [];

  const roles = useMemo(() => rolesForSport(sport), [sport]);

  function toggleEquipment(item: Equipment) {
    setEquipment((prev) => (prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]));
  }

  function generate() {
    setGenerated(
      generateWorkout({
        sport,
        position: position || undefined,
        goal,
        experience,
        equipment,
        durationMinutes: duration,
        intensity,
        trainingDaysPerWeek: defaultTrainingDaysPerWeek,
      })
    );
  }

  async function addToPlan() {
    if (!generated) return;
    setSaving(true);
    setError(null);
    try {
      const description = `${generated.objective} Estimated duration: ${generated.estimatedDurationMinutes} min · Intensity: ${generated.intensity}${
        generated.equipment.length ? ` · Equipment: ${generated.equipment.join(", ")}` : ""
      }`.slice(0, 1000);

      const exercises = [
        ...toExercises(generated.warmup, "Warm-Up"),
        ...toExercises(generated.drills),
        ...toExercises(generated.cooldown, "Cooldown"),
      ];

      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generated.name,
          category: generated.category,
          description,
          exercises,
          teamId: isTemplate ? undefined : teamId || undefined,
          assignedToId: isTemplate ? undefined : assignedToId || undefined,
          isTemplate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save workout.");
        return;
      }
      onCreated({
        id: data.workout.id,
        title: data.workout.title,
        category: data.workout.category,
        description: data.workout.description,
        exercises,
        teamId: data.workout.teamId,
        teamName: isTemplate ? null : manageableTeams.find((t) => t.id === teamId)?.name ?? null,
        assignedToId: data.workout.assignedToId,
        assignedToName: isTemplate ? null : roster.find((r) => r.id === assignedToId)?.name ?? null,
        isTemplate: data.workout.isTemplate,
        canManage: true,
        isPlanWorkout: false,
        yourCompletions: 0,
        lastCompletedAt: null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 mb-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="mono text-text-3">MENTA workout generator</div>
        <button type="button" onClick={onSwitchToManual} className="text-xs text-text-2 hover:text-text-1">
          Build a custom workout instead →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="gen-sport">Sport</label>
          <Select
            id="gen-sport"
            value={sport}
            onChange={(v) => {
              setSport(v);
              if (!rolesForSport(v).includes(position)) setPosition("");
            }}
            options={SPORTS.map((s) => ({ value: s.name, label: s.name }))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="gen-position">{roleLabel(sport)}</label>
          {roles.length > 0 ? (
            <Select
              id="gen-position"
              value={position}
              onChange={setPosition}
              placeholder={`Any ${roleLabel(sport).toLowerCase()}`}
              options={roles.map((r) => ({ value: r, label: r }))}
            />
          ) : (
            <input
              id="gen-position"
              className="field-input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Optional"
            />
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="gen-goal">Goal</label>
          <Select
            id="gen-goal"
            value={goal}
            onChange={(v) => setGoal(v as Goal)}
            options={GOALS.map((g) => ({ value: g, label: goalLabel(g) }))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="gen-experience">Experience</label>
          <Select
            id="gen-experience"
            value={experience}
            onChange={(v) => setExperience(v as Experience)}
            options={EXPERIENCE_LEVELS.map((e) => ({ value: e, label: e }))}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="gen-duration">Duration</label>
          <Select
            id="gen-duration"
            value={String(duration)}
            onChange={(v) => setDuration(Number(v))}
            options={DURATION_OPTIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="gen-intensity">Intensity</label>
          <Select
            id="gen-intensity"
            value={intensity}
            onChange={(v) => setIntensity(v as Intensity)}
            options={INTENSITY_LEVELS.map((i) => ({ value: i, label: i }))}
          />
        </div>

        {manageableTeams.length > 0 && !isTemplate && (
          <div className="col-span-2">
            <label className="field-label" htmlFor="gen-team">Assign to</label>
            <select
              id="gen-team"
              className="field-select"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setAssignedToId("");
              }}
            >
              <option value="">Personal (my training plan)</option>
              {manageableTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} (team)</option>
              ))}
            </select>
          </div>
        )}
        {teamId && !isTemplate && roster.length > 0 && (
          <div className="col-span-2">
            <label className="field-label" htmlFor="gen-assignee">Who on the team?</label>
            <select id="gen-assignee" className="field-select" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Whole team</option>
              {roster.map((r) => (
                <option key={r.id} value={r.id}>Just {r.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {manageableTeams.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} />
          Save as a reusable template instead of a live workout
        </label>
      )}

      <div>
        <div className="field-label">Available equipment (optional)</div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleEquipment(item)}
              className="badge"
              style={{ cursor: "pointer", opacity: equipment.includes(item) ? 1 : 0.5 }}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="text-text-3 text-xs mt-1">Leave all unselected for a bodyweight-only workout.</p>
      </div>

      <button type="button" onClick={generate} className="btn-primary">
        Generate workout
      </button>

      {generated && (
        <div className="pt-5 border-t border-[var(--border)] space-y-4">
          <div>
            <div className="text-lg font-semibold">{generated.name}</div>
            <p className="text-text-2 text-sm mt-1">{generated.objective}</p>
          </div>

          <DrillSection title="Warm-Up" drills={generated.warmup} />
          <DrillSection title="Drills" drills={generated.drills} numbered />
          <DrillSection title="Cooldown" drills={generated.cooldown} />

          <p className="mono text-text-3 text-xs">
            Estimated duration: {generated.estimatedDurationMinutes} min · Intensity: {generated.intensity}
            {generated.equipment.length ? ` · Equipment: ${generated.equipment.join(", ")}` : " · Equipment: none"}
          </p>

          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

          <button type="button" disabled={saving} onClick={addToPlan} className="btn-primary">
            {saving ? "Saving…" : "Add to my training plan"}
          </button>
        </div>
      )}
    </div>
  );
}

function DrillSection({ title, drills, numbered }: { title: string; drills: Drill[]; numbered?: boolean }) {
  if (drills.length === 0) return null;
  return (
    <div>
      <div className="mono text-text-3 text-xs mb-2">{title.toUpperCase()}</div>
      <ul className="space-y-3">
        {drills.map((d, i) => (
          <li key={d.name} className="text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{numbered ? `${i + 1}. ${d.name}` : d.name}</span>
              <span className="text-text-3">{d.volume}</span>
            </div>
            <p className="text-text-2 mt-0.5">{d.instructions}</p>
            <p className="text-text-3 text-xs mt-0.5">Cue: {d.cue}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
