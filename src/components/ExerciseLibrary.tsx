"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

export type ExerciseItem = {
  id: string;
  name: string;
  category: string;
  sport: string | null;
  positions: string[];
  equipment: string[];
  instructions: string | null;
  coachingCues: string | null;
  isGlobal: boolean;
  teamName: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  WARMUP: "Warmup",
  STRENGTH: "Strength",
  SPEED: "Speed",
  AGILITY: "Agility",
  CONDITIONING: "Conditioning",
  MOBILITY: "Mobility",
  SKILL: "Skill",
  RECOVERY: "Recovery",
  COOLDOWN: "Cooldown",
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

function distinctSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

/**
 * All filtering happens client-side against the already-fetched list —
 * at library-catalog scale (dozens to low hundreds of rows) this is
 * faster and simpler than round-tripping every keystroke through
 * /api/exercises, which still independently supports the same q/
 * category/sport/position/equipment params for any future consumer that
 * needs server-side filtering (a paginated library, a mobile client).
 */
export function ExerciseLibrary({
  initialExercises,
  manageableTeams,
}: {
  initialExercises: ExerciseItem[];
  manageableTeams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [equipment, setEquipment] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const sportOptions = useMemo(() => distinctSorted(exercises.map((e) => e.sport)), [exercises]);
  const positionOptions = useMemo(() => distinctSorted(exercises.flatMap((e) => e.positions)), [exercises]);
  const equipmentOptions = useMemo(() => distinctSorted(exercises.flatMap((e) => e.equipment)), [exercises]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return exercises.filter((e) => {
      if (query && !e.name.toLowerCase().includes(query)) return false;
      if (category && e.category !== category) return false;
      if (sport && e.sport !== sport) return false;
      if (position && !e.positions.includes(position)) return false;
      if (equipment && !e.equipment.includes(equipment)) return false;
      return true;
    });
  }, [exercises, q, category, sport, position, equipment]);

  return (
    <div>
      <div className="card p-4 mb-6 space-y-3">
        <input
          className="field-input"
          placeholder="Search exercises…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select className="field-select" value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="">All sports</option>
            {sportOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="field-select" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">All positions</option>
            {positionOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select className="field-select" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">All equipment</option>
            {equipmentOptions.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No exercises match" description="Try a different search or clear a filter." />
      ) : (
        <div className="card">
          <ul>
            {filtered.map((e) => (
              <li key={e.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border-soft)" }}>
                <Link
                  href={`/train/exercises/${e.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-[var(--surface-hover,rgba(0,0,0,0.02))]"
                >
                  <span className="flex-1 font-medium truncate">{e.name}</span>
                  <span className="badge shrink-0">{CATEGORY_LABELS[e.category] ?? e.category}</span>
                  {e.sport && <span className="badge shrink-0">{e.sport}</span>}
                  <span className="mono text-text-3 text-xs shrink-0">{e.isGlobal ? "MENTA" : e.teamName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {manageableTeams.length > 0 && (
        <div className="mt-6">
          {!showCreate ? (
            <button className="btn-secondary text-xs" onClick={() => setShowCreate(true)}>
              Add custom exercise
            </button>
          ) : (
            <CreateExerciseForm
              teams={manageableTeams}
              onCreated={(exercise) => {
                setExercises((list) => [exercise, ...list]);
                setShowCreate(false);
                router.refresh();
              }}
              onCancel={() => setShowCreate(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CreateExerciseForm({
  teams,
  onCreated,
  onCancel,
}: {
  teams: { id: string; name: string }[];
  onCreated: (exercise: ExerciseItem) => void;
  onCancel: () => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[1]);
  const [sport, setSport] = useState("");
  const [instructions, setInstructions] = useState("");
  const [coachingCues, setCoachingCues] = useState("");
  const [equipmentText, setEquipmentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const equipment = equipmentText
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          name: name.trim(),
          category,
          sport: sport.trim() || undefined,
          instructions: instructions.trim() || undefined,
          coachingCues: coachingCues.trim() || undefined,
          equipment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create exercise.");
        return;
      }
      onCreated(data.exercise);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 max-w-md">
      {teams.length > 1 && (
        <select className="field-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}
      <input className="field-input" placeholder="Exercise name" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <input className="field-input" placeholder="Sport (optional)" value={sport} onChange={(e) => setSport(e.target.value)} />
      </div>
      <textarea
        className="field-textarea"
        rows={2}
        placeholder="Instructions (optional)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Coaching cue (optional)"
        value={coachingCues}
        onChange={(e) => setCoachingCues(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Equipment, comma separated (optional)"
        value={equipmentText}
        onChange={(e) => setEquipmentText(e.target.value)}
      />
      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-xs" disabled={saving}>
          {saving ? "Saving…" : "Add exercise"}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
