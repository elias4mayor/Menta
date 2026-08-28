"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExercisePicker, type PickableExercise } from "@/components/ExercisePicker";

const BLOCK_TYPES = ["WARMUP", "ACTIVATION", "POWER", "STRENGTH", "ACCESSORY", "CONDITIONING", "MOBILITY", "RECOVERY"];
const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"];

type ExerciseDraft = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  targetSets: string;
  targetReps: string;
  targetLoad: string;
  targetLoadPercent: string;
  notes: string;
};

type BlockDraft = {
  key: string;
  title: string;
  blockType: string;
  exercises: ExerciseDraft[];
};

export type ProgramDetail = {
  id: string;
  title: string;
  description: string | null;
  sport: string | null;
  status: string;
  positionGroupId: string | null;
  positionGroupName: string | null;
  blocks: {
    id: string;
    title: string;
    blockType: string | null;
    order: number;
    exercises: {
      id: string;
      exerciseId: string;
      exerciseName: string;
      exerciseCategory: string;
      order: number;
      targetSets: number | null;
      targetReps: string | null;
      targetLoad: number | null;
      targetLoadPercent: number | null;
      notes: string | null;
    }[];
  }[];
};

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `draft-${keyCounter}`;
}

function toBlockDrafts(program: ProgramDetail): BlockDraft[] {
  return program.blocks.map((b) => ({
    key: nextKey(),
    title: b.title,
    blockType: b.blockType ?? "",
    exercises: b.exercises.map((e) => ({
      key: nextKey(),
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      exerciseCategory: e.exerciseCategory,
      targetSets: e.targetSets?.toString() ?? "",
      targetReps: e.targetReps ?? "",
      targetLoad: e.targetLoad?.toString() ?? "",
      targetLoadPercent: e.targetLoadPercent?.toString() ?? "",
      notes: e.notes ?? "",
    })),
  }));
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Deliberately "simple mode": sets / reps / load / load% / notes per
 * exercise — the four numbers the product brief's own examples actually
 * show ("4x5 @ 80%"). tempo/rest/RPE/superset already exist on
 * ProgramExercise and the API accepts them, but exposing every schema
 * field in this first builder UI is exactly the "unnecessary complexity"
 * this phase was told to avoid; add them here later if real coach usage
 * asks for them.
 */
export function ProgramBuilder({ teamId, program, canManage }: { teamId: string; program: ProgramDetail; canManage: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(program.title);
  const [sport, setSport] = useState(program.sport ?? "");
  const [status, setStatus] = useState(program.status);
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => toBlockDrafts(program));
  const [pickerForBlock, setPickerForBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function addBlock() {
    setBlocks((bs) => [...bs, { key: nextKey(), title: "New block", blockType: "", exercises: [] }]);
  }

  function updateBlock(key: string, patch: Partial<BlockDraft>) {
    setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function removeBlock(key: string) {
    setBlocks((bs) => bs.filter((b) => b.key !== key));
  }

  function moveBlock(key: string, direction: -1 | 1) {
    setBlocks((bs) => {
      const index = bs.findIndex((b) => b.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= bs.length) return bs;
      const copy = [...bs];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function addExercise(blockKey: string, exercise: PickableExercise) {
    updateBlock(blockKey, {
      exercises: [
        ...(blocks.find((b) => b.key === blockKey)?.exercises ?? []),
        {
          key: nextKey(),
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseCategory: exercise.category,
          targetSets: "",
          targetReps: "",
          targetLoad: "",
          targetLoadPercent: "",
          notes: "",
        },
      ],
    });
    setPickerForBlock(null);
  }

  function updateExercise(blockKey: string, exerciseKey: string, patch: Partial<ExerciseDraft>) {
    setBlocks((bs) =>
      bs.map((b) =>
        b.key !== blockKey
          ? b
          : { ...b, exercises: b.exercises.map((e) => (e.key === exerciseKey ? { ...e, ...patch } : e)) }
      )
    );
  }

  function removeExercise(blockKey: string, exerciseKey: string) {
    setBlocks((bs) =>
      bs.map((b) => (b.key !== blockKey ? b : { ...b, exercises: b.exercises.filter((e) => e.key !== exerciseKey) }))
    );
  }

  function duplicateExercise(blockKey: string, exerciseKey: string) {
    setBlocks((bs) =>
      bs.map((b) => {
        if (b.key !== blockKey) return b;
        const original = b.exercises.find((e) => e.key === exerciseKey);
        if (!original) return b;
        return { ...b, exercises: [...b.exercises, { ...original, key: nextKey() }] };
      })
    );
  }

  function moveExercise(blockKey: string, exerciseKey: string, direction: -1 | 1) {
    setBlocks((bs) =>
      bs.map((b) => {
        if (b.key !== blockKey) return b;
        const index = b.exercises.findIndex((e) => e.key === exerciseKey);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= b.exercises.length) return b;
        const copy = [...b.exercises];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        return { ...b, exercises: copy };
      })
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        sport: sport.trim() || undefined,
        status,
        blocks: blocks.map((b, blockIndex) => ({
          title: b.title.trim() || "Untitled block",
          blockType: b.blockType || undefined,
          order: blockIndex,
          exercises: b.exercises.map((e, exerciseIndex) => ({
            exerciseId: e.exerciseId,
            order: exerciseIndex,
            targetSets: parseNumber(e.targetSets),
            targetReps: e.targetReps.trim() || undefined,
            targetLoad: parseNumber(e.targetLoad),
            targetLoadPercent: parseNumber(e.targetLoadPercent),
            notes: e.notes.trim() || undefined,
          })),
        })),
      };
      const res = await fetch(`/api/teams/${teamId}/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save program.");
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!confirm("Archive this program? Past sessions and training data are never affected.")) return;
    const res = await fetch(`/api/teams/${teamId}/programs/${program.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/team/${teamId}/programs`);
  }

  return (
    <div>
      <div className="card p-5 mb-6 space-y-3">
        <input className="field-input text-lg font-medium" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canManage} />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="field-input"
            placeholder="Sport (optional)"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            disabled={!canManage}
          />
          <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canManage}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {program.positionGroupName && (
          <div className="mono text-text-3 text-xs">Scoped to: {program.positionGroupName}</div>
        )}
        <Link href={`/team/${teamId}/programs/${program.id}/prescriptions`} className="text-xs text-text-2 hover:text-text-1 underline inline-block">
          Athlete prescriptions →
        </Link>
        <Link href={`/team/${teamId}/programs/${program.id}/sessions/new`} className="text-xs text-text-2 hover:text-text-1 underline inline-block ml-4">
          Start live session →
        </Link>
      </div>

      <div className="space-y-5">
        {blocks.map((block, blockIndex) => (
          <div key={block.key} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                className="field-input flex-1 mono text-xs uppercase tracking-wide"
                value={block.title}
                onChange={(e) => updateBlock(block.key, { title: e.target.value })}
                disabled={!canManage}
              />
              <select
                className="field-select"
                value={block.blockType}
                onChange={(e) => updateBlock(block.key, { blockType: e.target.value })}
                disabled={!canManage}
              >
                <option value="">Type</option>
                {BLOCK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {canManage && (
                <>
                  <button className="text-text-3 hover:text-text-1 text-xs" onClick={() => moveBlock(block.key, -1)} disabled={blockIndex === 0}>
                    ↑
                  </button>
                  <button
                    className="text-text-3 hover:text-text-1 text-xs"
                    onClick={() => moveBlock(block.key, 1)}
                    disabled={blockIndex === blocks.length - 1}
                  >
                    ↓
                  </button>
                  <button className="text-text-3 hover:text-[var(--danger)] text-xs" onClick={() => removeBlock(block.key)}>
                    Remove
                  </button>
                </>
              )}
            </div>

            {block.exercises.length === 0 ? (
              <p className="text-text-3 text-xs mb-3">No exercises in this block yet.</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {block.exercises.map((ex, exIndex) => (
                  <li key={ex.key} className="flex items-center gap-2 flex-wrap p-2 rounded" style={{ border: "1px solid var(--border-soft)" }}>
                    <span className="font-medium text-sm min-w-[9rem]">{ex.exerciseName}</span>
                    <input
                      className="field-input w-16 text-xs"
                      placeholder="Sets"
                      value={ex.targetSets}
                      onChange={(e) => updateExercise(block.key, ex.key, { targetSets: e.target.value })}
                      disabled={!canManage}
                    />
                    <input
                      className="field-input w-20 text-xs"
                      placeholder="Reps"
                      value={ex.targetReps}
                      onChange={(e) => updateExercise(block.key, ex.key, { targetReps: e.target.value })}
                      disabled={!canManage}
                    />
                    <input
                      className="field-input w-20 text-xs"
                      placeholder="Load"
                      value={ex.targetLoad}
                      onChange={(e) => updateExercise(block.key, ex.key, { targetLoad: e.target.value })}
                      disabled={!canManage}
                    />
                    <input
                      className="field-input w-16 text-xs"
                      placeholder="Load %"
                      value={ex.targetLoadPercent}
                      onChange={(e) => updateExercise(block.key, ex.key, { targetLoadPercent: e.target.value })}
                      disabled={!canManage}
                    />
                    <input
                      className="field-input flex-1 min-w-[8rem] text-xs"
                      placeholder="Cue / notes (optional)"
                      value={ex.notes}
                      onChange={(e) => updateExercise(block.key, ex.key, { notes: e.target.value })}
                      disabled={!canManage}
                    />
                    {canManage && (
                      <div className="flex gap-1 shrink-0">
                        <button className="text-text-3 hover:text-text-1 text-xs" onClick={() => moveExercise(block.key, ex.key, -1)} disabled={exIndex === 0}>
                          ↑
                        </button>
                        <button
                          className="text-text-3 hover:text-text-1 text-xs"
                          onClick={() => moveExercise(block.key, ex.key, 1)}
                          disabled={exIndex === block.exercises.length - 1}
                        >
                          ↓
                        </button>
                        <button className="text-text-3 hover:text-text-1 text-xs" onClick={() => duplicateExercise(block.key, ex.key)}>
                          Duplicate
                        </button>
                        <button className="text-text-3 hover:text-[var(--danger)] text-xs" onClick={() => removeExercise(block.key, ex.key)}>
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage &&
              (pickerForBlock === block.key ? (
                <ExercisePicker onSelect={(ex) => addExercise(block.key, ex)} onClose={() => setPickerForBlock(null)} />
              ) : (
                <button className="btn-secondary text-xs" onClick={() => setPickerForBlock(block.key)}>
                  + Add exercise
                </button>
              ))}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="flex items-center gap-3 mt-6">
          <button className="btn-secondary text-xs" onClick={addBlock}>
            + Add block
          </button>
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save program"}
          </button>
          <button className="text-xs text-text-3 hover:text-[var(--danger)]" onClick={archive}>
            Archive
          </button>
          {savedAt && <span className="mono text-text-3 text-xs">Saved</span>}
          {error && <span className="text-xs" style={{ color: "var(--danger)" }}>{error}</span>}
        </div>
      )}
    </div>
  );
}
