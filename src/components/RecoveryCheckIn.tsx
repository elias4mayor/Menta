"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type WellnessCheckInItem = {
  id: string;
  date: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  energy: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  readiness: number | null;
  notes: string | null;
};

type Draft = {
  sleepHours: string;
  sleepQuality?: number;
  energy?: number;
  soreness?: number;
  stress?: number;
  mood?: number;
  readiness?: number;
  notes: string;
};

const EMPTY_DRAFT: Draft = { sleepHours: "", notes: "" };

function draftFromCheckIn(c: WellnessCheckInItem): Draft {
  return {
    sleepHours: c.sleepHours != null ? String(c.sleepHours) : "",
    sleepQuality: c.sleepQuality ?? undefined,
    energy: c.energy ?? undefined,
    soreness: c.soreness ?? undefined,
    stress: c.stress ?? undefined,
    mood: c.mood ?? undefined,
    readiness: c.readiness ?? undefined,
    notes: c.notes ?? "",
  };
}

function ScaleButtons({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="field-label mb-0">{label}</span>
        {value !== undefined && <span className="mono text-text-3 text-xs">{value}/5</span>}
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className="flex-1 py-2 rounded-[var(--r-sm)] text-sm transition-colors"
            style={{
              border: value === n ? "1px solid var(--border-strong)" : "1px solid var(--border)",
              background: value === n ? "var(--text-1)" : "var(--surface-2)",
              color: value === n ? "#08080a" : "var(--text-2)",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-text-3 text-xs mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function recoveryStatus(readiness?: number, soreness?: number, stress?: number): string | null {
  if (readiness === undefined) return null;
  let base: string;
  if (readiness >= 4) base = "Feeling ready — generally good conditions for a normal training day.";
  else if (readiness === 3) base = "Moderate readiness — listen to your body today.";
  else base = "Lower readiness — consider prioritizing recovery today: extra sleep, hydration, or a lighter session.";
  const extra: string[] = [];
  if (soreness !== undefined && soreness >= 4) extra.push("soreness is elevated");
  if (stress !== undefined && stress >= 4) extra.push("stress is elevated");
  if (extra.length) base += ` Your ${extra.join(" and ")} today, so extra recovery focus may help.`;
  return base;
}

export function RecoveryCheckIn({ todayCheckIn }: { todayCheckIn: WellnessCheckInItem | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!todayCheckIn);
  const [draft, setDraft] = useState<Draft>(todayCheckIn ? draftFromCheckIn(todayCheckIn) : EMPTY_DRAFT);
  const [current, setCurrent] = useState(todayCheckIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      sleepHours: draft.sleepHours ? Number(draft.sleepHours) : undefined,
      sleepQuality: draft.sleepQuality,
      energy: draft.energy,
      soreness: draft.soreness,
      stress: draft.stress,
      mood: draft.mood,
      readiness: draft.readiness,
      notes: draft.notes || undefined,
    };
    try {
      const res = await fetch(current ? `/api/wellness/${current.id}` : "/api/wellness", {
        method: current ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save this check-in.");
        return;
      }
      setCurrent(data.checkIn);
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && current) {
    const status = recoveryStatus(current.readiness ?? undefined, current.soreness ?? undefined, current.stress ?? undefined);
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Today&rsquo;s check-in</div>
          <button onClick={() => setEditing(true)} className="text-xs text-text-2 hover:text-text-1">
            Edit
          </button>
        </div>
        {status && <p className="text-sm mb-4">{status}</p>}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
          {current.sleepHours != null && <Metric label="Sleep" value={`${current.sleepHours}h`} />}
          {current.sleepQuality != null && <Metric label="Sleep quality" value={`${current.sleepQuality}/5`} />}
          {current.energy != null && <Metric label="Energy" value={`${current.energy}/5`} />}
          {current.soreness != null && <Metric label="Soreness" value={`${current.soreness}/5`} />}
          {current.stress != null && <Metric label="Stress" value={`${current.stress}/5`} />}
          {current.readiness != null && <Metric label="Readiness" value={`${current.readiness}/5`} />}
        </div>
        {current.notes && <p className="text-text-2 text-sm mt-4">{current.notes}</p>}
        <p className="text-text-3 text-xs mt-4">
          General wellness tracking, not a medical evaluation. This is never used to clear you to play or
          diagnose an injury.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="mono text-text-3">{current ? "Edit today's check-in" : "Today's wellness check-in"}</div>
      <p className="text-text-2 text-sm">
        Every field is optional — log what feels relevant. This is a wellness tracker, not a medical
        evaluation.
      </p>

      <div>
        <label className="field-label" htmlFor="sleepHours">Sleep duration (hours)</label>
        <input
          id="sleepHours"
          type="number"
          min={0}
          max={24}
          step={0.25}
          className="field-input"
          value={draft.sleepHours}
          onChange={(e) => update("sleepHours", e.target.value)}
        />
      </div>

      <ScaleButtons label="Sleep quality" value={draft.sleepQuality} onChange={(v) => update("sleepQuality", v)} lowLabel="Poor" highLabel="Excellent" />
      <ScaleButtons label="Energy" value={draft.energy} onChange={(v) => update("energy", v)} lowLabel="Drained" highLabel="Energized" />
      <ScaleButtons label="Muscle soreness" value={draft.soreness} onChange={(v) => update("soreness", v)} lowLabel="None" highLabel="Severe" />
      <ScaleButtons label="Stress" value={draft.stress} onChange={(v) => update("stress", v)} lowLabel="Calm" highLabel="Very stressed" />
      <ScaleButtons label="Mood" value={draft.mood} onChange={(v) => update("mood", v)} lowLabel="Low" highLabel="Great" />
      <ScaleButtons label="Perceived readiness" value={draft.readiness} onChange={(v) => update("readiness", v)} lowLabel="Not ready" highLabel="Fully ready" />

      <div>
        <label className="field-label" htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          rows={2}
          className="field-textarea"
          value={draft.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : current ? "Save changes" : "Save check-in"}
        </button>
        {current && (
          <button type="button" onClick={() => { setEditing(false); setDraft(draftFromCheckIn(current)); }} className="text-xs text-text-2 hover:text-text-1">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-text-3 text-xs mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
