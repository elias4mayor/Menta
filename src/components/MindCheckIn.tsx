"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { competitionLabel } from "@/lib/sports";

export type MindCheckInItem = {
  id: string;
  date: string;
  pressure: number | null;
  confidence: number | null;
  focus: number | null;
  readiness: number | null;
  todayGoal: string | null;
  notes: string | null;
};

type Draft = {
  pressure?: number;
  confidence?: number;
  focus?: number;
  readiness?: number;
  todayGoal: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = { todayGoal: "", notes: "" };

function draftFromCheckIn(c: MindCheckInItem): Draft {
  return {
    pressure: c.pressure ?? undefined,
    confidence: c.confidence ?? undefined,
    focus: c.focus ?? undefined,
    readiness: c.readiness ?? undefined,
    todayGoal: c.todayGoal ?? "",
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
              color: value === n ? "var(--bg)" : "var(--text-2)",
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

function mindStatus(sport: string | null | undefined, confidence?: number, pressure?: number, focus?: number): string | null {
  if (confidence === undefined && pressure === undefined && focus === undefined) return null;
  const comp = competitionLabel(sport).toLowerCase();
  const low = [confidence, focus].filter((v): v is number => v !== undefined && v <= 2).length > 0;
  const highPressure = pressure !== undefined && pressure >= 4;
  if (low) {
    return `Confidence or focus is reading low today — that's normal before a ${comp}. Your pre-${comp} routine is there for exactly this.`;
  }
  if (highPressure) {
    return `Pressure is elevated today. Elevated pressure isn't a bad sign — it usually means the ${comp} matters. Lean on your focus cue.`;
  }
  return `Mental state looks solid heading into your next ${comp}. Keep the same preparation that got you here.`;
}

export function MindCheckIn({
  todayCheckIn,
  sport,
}: {
  todayCheckIn: MindCheckInItem | null;
  sport?: string | null;
}) {
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
      pressure: draft.pressure,
      confidence: draft.confidence,
      focus: draft.focus,
      readiness: draft.readiness,
      todayGoal: draft.todayGoal || undefined,
      notes: draft.notes || undefined,
    };
    try {
      const res = await fetch(current ? `/api/mind/${current.id}` : "/api/mind", {
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
    const status = mindStatus(sport, current.confidence ?? undefined, current.pressure ?? undefined, current.focus ?? undefined);
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Today&rsquo;s check-in</div>
          <button onClick={() => setEditing(true)} className="text-xs text-text-2 hover:text-text-1">
            Edit
          </button>
        </div>
        {current.todayGoal && (
          <p className="text-sm mb-3">
            <span className="text-text-2">Today&rsquo;s mental goal:</span> {current.todayGoal}
          </p>
        )}
        {status && <p className="text-sm mb-4">{status}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {current.pressure != null && <Metric label="Pressure" value={`${current.pressure}/5`} />}
          {current.confidence != null && <Metric label="Confidence" value={`${current.confidence}/5`} />}
          {current.focus != null && <Metric label="Focus" value={`${current.focus}/5`} />}
          {current.readiness != null && <Metric label="Readiness" value={`${current.readiness}/5`} />}
        </div>
        {current.notes && <p className="text-text-2 text-sm mt-4">{current.notes}</p>}
        <p className="text-text-3 text-xs mt-4">
          Performance journaling, not a substitute for licensed mental-health care. If something feels like
          more than performance stress, talk to a coach, counselor, or qualified professional.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="mono text-text-3">{current ? "Edit today's check-in" : "Today's mental performance check-in"}</div>
      <p className="text-text-2 text-sm">
        Every field is optional — log what feels relevant. This is performance journaling, not mental-health
        treatment.
      </p>

      <div>
        <label className="field-label" htmlFor="todayGoal">Today&rsquo;s mental goal</label>
        <input
          id="todayGoal"
          className="field-input"
          maxLength={200}
          placeholder="e.g. Stay locked on my routine, not the outcome"
          value={draft.todayGoal}
          onChange={(e) => update("todayGoal", e.target.value)}
        />
      </div>

      <ScaleButtons label="Pressure" value={draft.pressure} onChange={(v) => update("pressure", v)} lowLabel="Low" highLabel="High" />
      <ScaleButtons label="Confidence" value={draft.confidence} onChange={(v) => update("confidence", v)} lowLabel="Shaky" highLabel="Locked in" />
      <ScaleButtons label="Focus" value={draft.focus} onChange={(v) => update("focus", v)} lowLabel="Scattered" highLabel="Sharp" />
      <ScaleButtons label="Readiness" value={draft.readiness} onChange={(v) => update("readiness", v)} lowLabel="Not ready" highLabel="Fully ready" />

      <div>
        <label className="field-label" htmlFor="mindNotes">Notes (optional)</label>
        <textarea
          id="mindNotes"
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
