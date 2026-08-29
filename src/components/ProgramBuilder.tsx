"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker, type PickableExercise } from "@/components/ExercisePicker";
import { NavTile } from "@/components/NavTile";
import { PresetSelect } from "@/components/PresetSelect";

const BLOCK_TYPES = ["WARMUP", "ACTIVATION", "POWER", "STRENGTH", "ACCESSORY", "CONDITIONING", "MOBILITY", "RECOVERY"];
const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"];

const TRAINING_MODES = [
  "WEIGHT_ROOM",
  "FIELD_CONDITIONING",
  "MOBILITY_STRETCH",
  "YOGA",
  "SPEED_AGILITY",
  "RECOVERY",
  "CUSTOM",
] as const;
type TrainingMode = (typeof TRAINING_MODES)[number];

const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  WEIGHT_ROOM: "Weight Room",
  FIELD_CONDITIONING: "Field / Conditioning",
  MOBILITY_STRETCH: "Mobility & Stretch",
  YOGA: "Yoga",
  SPEED_AGILITY: "Speed & Agility",
  RECOVERY: "Recovery",
  CUSTOM: "Custom",
};

/**
 * Every mode-specific programming control this builder can show, in one
 * flat vocabulary. A given mode's config (below) just lists which slots
 * count as "core" (always visible) vs "advanced" (behind the toggle) —
 * the row renderer below has exactly one switch statement mapping a slot
 * to its widget, so adding a mode is a config entry, not new JSX.
 */
type FieldSlot =
  | "sets" | "reps" | "load" | "loadPercent" | "distance" | "duration" | "rounds"
  | "side" | "intensityDescriptor" | "rest" | "tempo" | "rpe" | "intensityType"
  | "setType" | "pairing" | "breathing" | "transition" | "direction" | "notes";

const MODE_CONFIG: Record<TrainingMode, { core: FieldSlot[]; advanced: FieldSlot[] }> = {
  WEIGHT_ROOM: {
    core: ["sets", "reps", "load", "loadPercent"],
    advanced: ["tempo", "rest", "rpe", "intensityType", "setType", "pairing", "notes"],
  },
  FIELD_CONDITIONING: {
    core: ["sets", "reps", "distance", "duration"],
    advanced: ["rest", "intensityDescriptor", "notes"],
  },
  MOBILITY_STRETCH: {
    core: ["sets", "duration", "side", "intensityDescriptor"],
    advanced: ["rest", "notes"],
  },
  YOGA: {
    core: ["duration", "rounds", "side"],
    advanced: ["breathing", "transition", "notes"],
  },
  SPEED_AGILITY: {
    core: ["sets", "reps", "distance", "direction"],
    advanced: ["rest", "intensityDescriptor", "notes"],
  },
  RECOVERY: {
    core: ["duration", "rounds"],
    advanced: ["intensityDescriptor", "notes"],
  },
  CUSTOM: {
    core: ["sets", "reps", "load", "loadPercent"],
    advanced: ["tempo", "rest", "rpe", "distance", "duration", "side", "intensityDescriptor", "intensityType", "setType", "pairing", "breathing", "transition", "direction", "notes"],
  },
};

const SECONDS_PRESETS = (labels: [string, string][]) => labels.map(([label, value]) => ({ label, value }));
const DURATION_PRESETS = SECONDS_PRESETS([["15 sec", "15"], ["30 sec", "30"], ["45 sec", "45"], ["60 sec", "60"], ["90 sec", "90"], ["2 min", "120"]]);
const REST_PRESETS = SECONDS_PRESETS([["30 sec", "30"], ["45 sec", "45"], ["60 sec", "60"], ["90 sec", "90"], ["2:00", "120"], ["3:00", "180"], ["4:00", "240"]]);
const TRANSITION_PRESETS = SECONDS_PRESETS([["10 sec", "10"], ["15 sec", "15"], ["30 sec", "30"], ["60 sec", "60"]]);
const TEMPO_PRESETS = ["2-0-1", "3-1-1", "3-0-1", "X-0-X"].map((v) => ({ label: v, value: v }));

const SIDE_OPTIONS = [["Both", "BOTH"], ["Left", "LEFT"], ["Right", "RIGHT"], ["Alternating", "ALTERNATING"]];
const INTENSITY_DESCRIPTOR_OPTIONS = [["Easy", "EASY"], ["Moderate", "MODERATE"], ["Deep", "DEEP"]];
const INTENSITY_TYPE_OPTIONS = [["% 1RM", "PERCENT_1RM"], ["RPE", "RPE"], ["RIR", "RIR"], ["Coach Prescribed", "COACH_PRESCRIBED"]];
const SET_TYPE_OPTIONS = [
  ["Straight Sets", "STRAIGHT"], ["Warm-up", "WARMUP"], ["Top Set", "TOP_SET"], ["Back-off", "BACKOFF"],
  ["AMRAP", "AMRAP"], ["Cluster", "CLUSTER"], ["Drop Set", "DROP_SET"],
];
const PAIRING_OPTIONS = [["Superset", "SUPERSET"], ["A1 / A2", "A2"], ["A1 / A2 / A3", "A3"]];
const BREATHING_OPTIONS = [["Normal", "NORMAL"], ["Slow", "SLOW"], ["Guided", "GUIDED"]];
const DIRECTION_OPTIONS = [
  ["Forward", "FORWARD"], ["Lateral", "LATERAL"], ["Backpedal", "BACKPEDAL"],
  ["Change of Direction", "CHANGE_OF_DIRECTION"], ["Multi-directional", "MULTI_DIRECTIONAL"],
];

type ExerciseDraft = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  targetSets: string;
  targetReps: string;
  targetLoad: string;
  targetLoadPercent: string;
  tempo: string;
  restSec: string;
  durationSec: string;
  distanceMeters: string;
  rpeTarget: string;
  supersetGroup: string;
  notes: string;
  side: string;
  intensityDescriptor: string;
  intensityType: string;
  setType: string;
  breathing: string;
  direction: string;
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
  trainingMode: string | null;
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
      targetLoadUnit: string | null;
      tempo: string | null;
      restSec: number | null;
      durationSec: number | null;
      distanceMeters: number | null;
      rpeTarget: number | null;
      supersetGroup: string | null;
      notes: string | null;
      modeDetails: Record<string, string> | null;
    }[];
  }[];
};

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `draft-${keyCounter}`;
}

const EMPTY_EXERCISE_EXTRAS = { tempo: "", restSec: "", durationSec: "", distanceMeters: "", rpeTarget: "", supersetGroup: "", notes: "", side: "", intensityDescriptor: "", intensityType: "", setType: "", breathing: "", direction: "" };

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
      tempo: e.tempo ?? "",
      restSec: e.restSec?.toString() ?? "",
      durationSec: e.durationSec?.toString() ?? "",
      distanceMeters: e.distanceMeters?.toString() ?? "",
      rpeTarget: e.rpeTarget?.toString() ?? "",
      supersetGroup: e.supersetGroup ?? "",
      notes: e.notes ?? "",
      side: e.modeDetails?.side ?? "",
      intensityDescriptor: e.modeDetails?.intensityDescriptor ?? "",
      intensityType: e.modeDetails?.intensityType ?? "",
      setType: e.modeDetails?.setType ?? "",
      breathing: e.modeDetails?.breathing ?? "",
      direction: e.modeDetails?.direction ?? "",
    })),
  }));
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function selectOptions(pairs: string[][]) {
  return pairs.map(([label, value]) => ({ label, value }));
}

/**
 * "Simple by default, powerful when needed": the visible field set per
 * exercise is entirely driven by the program's Training Mode (see
 * MODE_CONFIG above) rather than one fixed layout for every program.
 * Weight Room keeps today's Sets/Reps/Load/Load% core set; every other
 * mode surfaces the handful of controls that actually matter for it
 * (Hold/Side for Yoga, Distance/Direction for Speed & Agility, etc.) —
 * see the Phase 6.1 spec's schema-audit note on why exactly two new
 * fields (TrainingProgram.trainingMode, ProgramExercise.modeDetails)
 * were the minimum needed, with everything else reusing existing
 * ProgramExercise columns under a different label/preset set.
 */
export function ProgramBuilder({ teamId, program, canManage }: { teamId: string; program: ProgramDetail; canManage: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(program.title);
  const [sport, setSport] = useState(program.sport ?? "");
  const [status, setStatus] = useState(program.status);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>((program.trainingMode as TrainingMode) ?? "WEIGHT_ROOM");
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => toBlockDrafts(program));
  const [pickerForBlock, setPickerForBlock] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<Set<string>>(new Set());
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const config = MODE_CONFIG[trainingMode];

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
          ...EMPTY_EXERCISE_EXTRAS,
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
    setOpenMenuKey(null);
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
    setOpenMenuKey(null);
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
    setOpenMenuKey(null);
  }

  function toggleAdvanced(exerciseKey: string) {
    setExpandedExercise((s) => {
      const next = new Set(s);
      if (next.has(exerciseKey)) next.delete(exerciseKey);
      else next.add(exerciseKey);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        sport: sport.trim() || undefined,
        status,
        trainingMode,
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
            tempo: e.tempo.trim() || undefined,
            restSec: parseNumber(e.restSec),
            durationSec: parseNumber(e.durationSec),
            distanceMeters: parseNumber(e.distanceMeters),
            rpeTarget: parseNumber(e.rpeTarget),
            supersetGroup: e.supersetGroup.trim() || undefined,
            notes: e.notes.trim() || undefined,
            modeDetails: {
              side: e.side || undefined,
              intensityDescriptor: e.intensityDescriptor || undefined,
              intensityType: e.intensityType || undefined,
              setType: e.setType || undefined,
              breathing: e.breathing || undefined,
              direction: e.direction || undefined,
            },
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

  function renderSlot(slot: FieldSlot, ex: ExerciseDraft, blockKey: string) {
    const set = (patch: Partial<ExerciseDraft>) => updateExercise(blockKey, ex.key, patch);
    switch (slot) {
      case "sets":
        return <input key={slot} className="field-input w-16 text-xs" placeholder="Sets" value={ex.targetSets} onChange={(e) => set({ targetSets: e.target.value })} disabled={!canManage} />;
      case "rounds":
        return <input key={slot} className="field-input w-20 text-xs" placeholder="Rounds" value={ex.targetSets} onChange={(e) => set({ targetSets: e.target.value })} disabled={!canManage} />;
      case "reps":
        return <input key={slot} className="field-input w-20 text-xs" placeholder="Reps" value={ex.targetReps} onChange={(e) => set({ targetReps: e.target.value })} disabled={!canManage} />;
      case "load":
        return <input key={slot} className="field-input w-20 text-xs" placeholder="Load" value={ex.targetLoad} onChange={(e) => set({ targetLoad: e.target.value })} disabled={!canManage} />;
      case "loadPercent":
        return <input key={slot} className="field-input w-16 text-xs" placeholder="Load %" value={ex.targetLoadPercent} onChange={(e) => set({ targetLoadPercent: e.target.value })} disabled={!canManage} />;
      case "distance":
        return <input key={slot} className="field-input w-24 text-xs" placeholder="Distance" value={ex.distanceMeters} onChange={(e) => set({ distanceMeters: e.target.value })} disabled={!canManage} />;
      case "duration":
        return <PresetSelect key={slot} value={ex.durationSec} presets={DURATION_PRESETS} placeholder="Duration" onChange={(v) => set({ durationSec: v })} className="field-input w-28 text-xs" />;
      case "rest":
        return <PresetSelect key={slot} value={ex.restSec} presets={REST_PRESETS} placeholder="Rest" onChange={(v) => set({ restSec: v })} className="field-input w-24 text-xs" />;
      case "transition":
        return <PresetSelect key={slot} value={ex.restSec} presets={TRANSITION_PRESETS} placeholder="Transition" onChange={(v) => set({ restSec: v })} className="field-input w-28 text-xs" />;
      case "tempo":
        return <PresetSelect key={slot} value={ex.tempo} presets={TEMPO_PRESETS} placeholder="Tempo" onChange={(v) => set({ tempo: v })} className="field-input w-24 text-xs" />;
      case "rpe":
        return (
          <select key={slot} className="field-select w-20 text-xs" value={ex.rpeTarget} onChange={(e) => set({ rpeTarget: e.target.value })} disabled={!canManage}>
            <option value="">RPE</option>
            {["6", "7", "8", "9", "10"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        );
      case "side":
        return <LabeledSelect key={slot} value={ex.side} options={selectOptions(SIDE_OPTIONS)} placeholder="Side" onChange={(v) => set({ side: v })} disabled={!canManage} />;
      case "intensityDescriptor":
        return <LabeledSelect key={slot} value={ex.intensityDescriptor} options={selectOptions(INTENSITY_DESCRIPTOR_OPTIONS)} placeholder="Intensity" onChange={(v) => set({ intensityDescriptor: v })} disabled={!canManage} />;
      case "intensityType":
        return <LabeledSelect key={slot} value={ex.intensityType} options={selectOptions(INTENSITY_TYPE_OPTIONS)} placeholder="Intensity type" onChange={(v) => set({ intensityType: v })} disabled={!canManage} />;
      case "setType":
        return <LabeledSelect key={slot} value={ex.setType} options={selectOptions(SET_TYPE_OPTIONS)} placeholder="Set type" onChange={(v) => set({ setType: v })} disabled={!canManage} />;
      case "pairing":
        return <LabeledSelect key={slot} value={ex.supersetGroup} options={selectOptions(PAIRING_OPTIONS)} placeholder="Pairing" onChange={(v) => set({ supersetGroup: v })} disabled={!canManage} />;
      case "breathing":
        return <LabeledSelect key={slot} value={ex.breathing} options={selectOptions(BREATHING_OPTIONS)} placeholder="Breathing" onChange={(v) => set({ breathing: v })} disabled={!canManage} />;
      case "direction":
        return <LabeledSelect key={slot} value={ex.direction} options={selectOptions(DIRECTION_OPTIONS)} placeholder="Direction" onChange={(v) => set({ direction: v })} disabled={!canManage} />;
      case "notes":
        return <input key={slot} className="field-input flex-1 min-w-[8rem] text-xs" placeholder="Notes" value={ex.notes} onChange={(e) => set({ notes: e.target.value })} disabled={!canManage} />;
      default:
        return null;
    }
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
        <div>
          <span className="mono text-text-3 text-xs block mb-1.5">Training mode</span>
          <select className="field-select" value={trainingMode} onChange={(e) => setTrainingMode(e.target.value as TrainingMode)} disabled={!canManage}>
            {TRAINING_MODES.map((m) => (
              <option key={m} value={m}>{TRAINING_MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>
        {program.positionGroupName && (
          <div className="mono text-text-3 text-xs">Scoped to: {program.positionGroupName}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <NavTile href={`/team/${teamId}/programs/${program.id}/prescriptions`} icon="team" label="Athlete prescriptions" compact />
          <NavTile href={`/team/${teamId}/programs/${program.id}/sessions/new`} icon="spark" label="Start live session" compact />
        </div>
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
                {block.exercises.map((ex, exIndex) => {
                  const advancedOpen = expandedExercise.has(ex.key);
                  const menuOpen = openMenuKey === ex.key;
                  return (
                    <li key={ex.key} className="p-3 rounded" style={{ border: "1px solid var(--border-soft)" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm min-w-[9rem] flex-1">{ex.exerciseName}</span>
                        {config.core.map((slot) => renderSlot(slot, ex, block.key))}
                        {config.advanced.length > 0 && (
                          <button
                            type="button"
                            className="text-text-3 hover:text-text-1 text-xs shrink-0"
                            onClick={() => toggleAdvanced(ex.key)}
                          >
                            Advanced {advancedOpen ? "▴" : "▾"}
                          </button>
                        )}
                        {canManage && (
                          <div className="relative shrink-0">
                            {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuKey(null)} />}
                            <button
                              type="button"
                              aria-label="Exercise actions"
                              className="text-text-3 hover:text-text-1 text-sm px-1.5 py-0.5"
                              onClick={() => setOpenMenuKey(menuOpen ? null : ex.key)}
                            >
                              •••
                            </button>
                            <div className={`nav-dropdown${menuOpen ? " nav-dropdown-open" : ""}`} style={{ zIndex: 50 }}>
                              <div className="p-1.5" style={{ width: 160 }}>
                                <button
                                  type="button"
                                  className="nav-dropdown-item w-full text-left px-2.5 py-2 rounded-[var(--r-sm)] text-sm disabled:opacity-40"
                                  onClick={() => moveExercise(block.key, ex.key, -1)}
                                  disabled={exIndex === 0}
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  className="nav-dropdown-item w-full text-left px-2.5 py-2 rounded-[var(--r-sm)] text-sm disabled:opacity-40"
                                  onClick={() => moveExercise(block.key, ex.key, 1)}
                                  disabled={exIndex === block.exercises.length - 1}
                                >
                                  Move down
                                </button>
                                <button
                                  type="button"
                                  className="nav-dropdown-item w-full text-left px-2.5 py-2 rounded-[var(--r-sm)] text-sm"
                                  onClick={() => duplicateExercise(block.key, ex.key)}
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  className="nav-dropdown-item w-full text-left px-2.5 py-2 rounded-[var(--r-sm)] text-sm"
                                  style={{ color: "var(--danger)" }}
                                  onClick={() => removeExercise(block.key, ex.key)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {advancedOpen && config.advanced.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-2 pt-2" style={{ borderTop: "1px dashed var(--border-soft)" }}>
                          {config.advanced.map((slot) => renderSlot(slot, ex, block.key))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {canManage &&
              (pickerForBlock === block.key ? (
                <ExercisePicker onSelect={(ex) => addExercise(block.key, ex)} onClose={() => setPickerForBlock(null)} />
              ) : (
                <button className="btn-primary text-xs" onClick={() => setPickerForBlock(block.key)}>
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

function LabeledSelect({
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  value: string;
  options: { label: string; value: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select className="field-select text-xs" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.label} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
