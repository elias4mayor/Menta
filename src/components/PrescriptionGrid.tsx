"use client";

import { useMemo, useState } from "react";
import type { ProgramDetail } from "@/components/ProgramBuilder";

type RosterAthlete = { id: string; name: string };

type PrescriptionRow = {
  id: string;
  programExerciseId: string;
  athleteId: string;
  athleteName: string;
  prescribedLoad: number | null;
  prescribedLoadUnit: string | null;
  prescribedReps: string | null;
  prescribedSets: number | null;
  calculationBasis: string | null;
  setByName: string;
  updatedAt: string;
};

type Draft = { load: string; reps: string; sets: string; basis: string };

const EMPTY_DRAFT: Draft = { load: "", reps: "", sets: "", basis: "MANUAL" };
const BASIS_OPTIONS = ["MANUAL", "PERCENT_1RM", "PREVIOUS_PERFORMANCE", "COACH_OVERRIDE"];

function draftFromRow(row: PrescriptionRow | undefined): Draft {
  if (!row) return EMPTY_DRAFT;
  return {
    load: row.prescribedLoad?.toString() ?? "",
    reps: row.prescribedReps ?? "",
    sets: row.prescribedSets?.toString() ?? "",
    basis: row.calculationBasis ?? "MANUAL",
  };
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function describeDefault(exercise: ProgramDetail["blocks"][number]["exercises"][number]): string {
  const parts: string[] = [];
  if (exercise.targetSets) parts.push(`${exercise.targetSets}×${exercise.targetReps ?? "?"}`);
  else if (exercise.targetReps) parts.push(exercise.targetReps);
  if (exercise.targetLoadPercent) parts.push(`@ ${exercise.targetLoadPercent}%`);
  else if (exercise.targetLoad) parts.push(`${exercise.targetLoad}`);
  return parts.length > 0 ? parts.join(" ") : "No default set";
}

/**
 * Program default (read-only, from ProgramExercise) and athlete
 * prescription (editable, per-athlete AthletePrescription) are always
 * shown as two visually distinct things on this screen — the default in
 * a muted reference line, prescriptions as the actual editable inputs,
 * with an empty input meaning "using the program default," never a
 * fabricated number. Nothing here is AI-written; every save is
 * attributed to the signed-in coach via the API's setById, never the
 * client.
 */
export function PrescriptionGrid({
  teamId,
  programId,
  canManage,
  program,
  roster,
  initialPrescriptions,
}: {
  teamId: string;
  programId: string;
  canManage: boolean;
  program: ProgramDetail;
  roster: RosterAthlete[];
  initialPrescriptions: PrescriptionRow[];
}) {
  const allExercises = useMemo(
    () => program.blocks.flatMap((b) => b.exercises.map((e) => ({ ...e, blockTitle: b.title }))),
    [program]
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState(allExercises[0]?.id ?? "");
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, PrescriptionRow[]>>(() => {
    const map: Record<string, PrescriptionRow[]> = {};
    for (const row of initialPrescriptions) {
      (map[row.programExerciseId] ??= []).push(row);
    }
    return map;
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedExercise = allExercises.find((e) => e.id === selectedExerciseId);
  const rowsForSelected = rowsByExercise[selectedExerciseId] ?? [];
  const rowByAthlete = new Map(rowsForSelected.map((r) => [r.athleteId, r]));

  function draftFor(athleteId: string): Draft {
    const key = `${selectedExerciseId}:${athleteId}`;
    return drafts[key] ?? draftFromRow(rowByAthlete.get(athleteId));
  }

  function setDraft(athleteId: string, patch: Partial<Draft>) {
    const key = `${selectedExerciseId}:${athleteId}`;
    setDrafts((d) => ({ ...d, [key]: { ...draftFor(athleteId), ...patch } }));
  }

  function toggleChecked(athleteId: string) {
    setChecked((c) => {
      const next = new Set(c);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  }

  function applyDefaultToChecked() {
    if (!selectedExercise) return;
    const load = selectedExercise.targetLoad?.toString() ?? "";
    const reps = selectedExercise.targetReps ?? "";
    const sets = selectedExercise.targetSets?.toString() ?? "";
    for (const athleteId of checked) {
      setDraft(athleteId, { load, reps, sets });
    }
  }

  function copyToChecked(sourceAthleteId: string) {
    const source = draftFor(sourceAthleteId);
    for (const athleteId of checked) {
      if (athleteId === sourceAthleteId) continue;
      setDraft(athleteId, { ...source });
    }
  }

  async function saveChecked() {
    if (checked.size === 0 || !selectedExerciseId) return;
    setSaving(true);
    setError(null);
    try {
      const prescriptions = Array.from(checked).map((athleteId) => {
        const d = draftFor(athleteId);
        return {
          athleteId,
          prescribedLoad: parseNumber(d.load),
          prescribedReps: d.reps.trim() || undefined,
          prescribedSets: parseNumber(d.sets),
          calculationBasis: d.basis,
        };
      });
      const res = await fetch(`/api/teams/${teamId}/programs/${programId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId: selectedExerciseId, prescriptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save prescriptions.");
        return;
      }
      setRowsByExercise((prev) => {
        const others = (prev[selectedExerciseId] ?? []).filter((r) => !checked.has(r.athleteId));
        return { ...prev, [selectedExerciseId]: [...others, ...data.prescriptions] };
      });
      setDrafts({});
    } finally {
      setSaving(false);
    }
  }

  async function clearOne(athleteId: string) {
    const res = await fetch(`/api/teams/${teamId}/programs/${programId}/prescriptions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programExerciseId: selectedExerciseId, athleteIds: [athleteId] }),
    });
    if (res.ok) {
      setRowsByExercise((prev) => ({
        ...prev,
        [selectedExerciseId]: (prev[selectedExerciseId] ?? []).filter((r) => r.athleteId !== athleteId),
      }));
    }
  }

  return (
    <div>
      <div className="mono text-text-3 mb-2">Athlete prescriptions</div>
      <h1 className="text-2xl font-semibold mb-6">{program.title}</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {allExercises.map((e) => (
          <button
            key={e.id}
            className="badge"
            style={
              e.id === selectedExerciseId
                ? { background: "var(--text-1)", color: "var(--surface, #fff)", borderColor: "var(--text-1)" }
                : undefined
            }
            onClick={() => setSelectedExerciseId(e.id)}
          >
            {e.exerciseName}
          </button>
        ))}
      </div>

      {selectedExercise && (
        <>
          <div className="card p-4 mb-4">
            <div className="mono text-text-3 text-xs mb-1">{selectedExercise.blockTitle} — Program default</div>
            <p className="text-lg">{describeDefault(selectedExercise)}</p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 mb-4">
              <button className="btn-secondary text-xs" onClick={applyDefaultToChecked} disabled={checked.size === 0}>
                Apply default to selected
              </button>
              <button className="btn-primary text-xs" onClick={saveChecked} disabled={saving || checked.size === 0}>
                {saving ? "Saving…" : `Save selected (${checked.size})`}
              </button>
              {error && <span className="text-xs" style={{ color: "var(--danger)" }}>{error}</span>}
            </div>
          )}

          <div className="card">
            <ul>
              {roster.map((athlete) => {
                const row = rowByAthlete.get(athlete.id);
                const draft = draftFor(athlete.id);
                const isChecked = checked.has(athlete.id);
                return (
                  <li
                    key={athlete.id}
                    className="flex items-center gap-2 flex-wrap p-3 border-b last:border-b-0"
                    style={{ borderColor: "var(--border-soft)" }}
                  >
                    {canManage && (
                      <input type="checkbox" checked={isChecked} onChange={() => toggleChecked(athlete.id)} />
                    )}
                    <span className="min-w-[9rem] font-medium text-sm">{athlete.name}</span>
                    <input
                      className="field-input w-20 text-xs"
                      placeholder="Load"
                      value={draft.load}
                      onChange={(e) => setDraft(athlete.id, { load: e.target.value })}
                      disabled={!canManage}
                    />
                    <input
                      className="field-input w-20 text-xs"
                      placeholder="Reps"
                      value={draft.reps}
                      onChange={(e) => setDraft(athlete.id, { reps: e.target.value })}
                      disabled={!canManage}
                    />
                    <input
                      className="field-input w-16 text-xs"
                      placeholder="Sets"
                      value={draft.sets}
                      onChange={(e) => setDraft(athlete.id, { sets: e.target.value })}
                      disabled={!canManage}
                    />
                    <select
                      className="field-select text-xs"
                      value={draft.basis}
                      onChange={(e) => setDraft(athlete.id, { basis: e.target.value })}
                      disabled={!canManage}
                    >
                      {BASIS_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {row ? (
                      <span className="mono text-text-3 text-xs">set by {row.setByName}</span>
                    ) : (
                      <span className="mono text-text-3 text-xs">using program default</span>
                    )}
                    {canManage && (
                      <div className="flex gap-2 ml-auto">
                        <button className="text-text-3 hover:text-text-1 text-xs" onClick={() => copyToChecked(athlete.id)}>
                          Copy to selected
                        </button>
                        {row && (
                          <button className="text-text-3 hover:text-[var(--danger)] text-xs" onClick={() => clearOne(athlete.id)}>
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
