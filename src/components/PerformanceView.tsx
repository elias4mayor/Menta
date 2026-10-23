"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

type Entry = {
  id: string;
  statName: string;
  value: number;
  unit: string | null;
  recordedAt: string;
  note: string | null;
};

/** Common athletic-testing stats — a quick-fill shortcut, not a restriction; the field stays free text for anything else. */
const STAT_PRESETS: { label: string; unit: string }[] = [
  { label: "40-Yard Dash", unit: "sec" },
  { label: "10-Yard Sprint", unit: "sec" },
  { label: "20-Yard Sprint", unit: "sec" },
  { label: "5-10-5 Shuttle", unit: "sec" },
  { label: "Vertical Jump", unit: "in" },
  { label: "Broad Jump", unit: "in" },
  { label: "Bench Press", unit: "lbs" },
  { label: "Back Squat", unit: "lbs" },
  { label: "Height", unit: "in" },
  { label: "Weight", unit: "lbs" },
];

/**
 * Which direction counts as a personal record, for the known athletic-
 * testing presets only — never guessed for a free-typed stat name (an
 * arbitrary "Points" or "ERA" entry has no safely assumable direction).
 * Height/Weight are deliberately absent: they're measurements, not
 * performance to set a record against.
 */
const PR_DIRECTION: Record<string, "lower" | "higher"> = {
  "40-Yard Dash": "lower",
  "10-Yard Sprint": "lower",
  "20-Yard Sprint": "lower",
  "5-10-5 Shuttle": "lower",
  "Vertical Jump": "higher",
  "Broad Jump": "higher",
  "Bench Press": "higher",
  "Back Squat": "higher",
};

export function PerformanceView({ initialEntries }: { initialEntries: Entry[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [statName, setStatName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!map.has(e.statName)) map.set(e.statName, []);
      map.get(e.statName)!.push(e);
    }
    return Array.from(map.entries()).map(([name, list]) => ({
      name,
      list: list.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    }));
  }, [entries]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statName, value: Number(value), unit: unit || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save entry.");
        return;
      }
      setEntries((e) => [data.entry, ...e]);
      setStatName("");
      setValue("");
      setUnit("");
      setShowForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Log a stat"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {STAT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="badge"
                style={{ cursor: "pointer", opacity: statName === p.label ? 1 : 0.6 }}
                onClick={() => {
                  setStatName(p.label);
                  setUnit(p.unit);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input className="field-input" placeholder="Stat name (e.g. 40-yard dash, Points, ERA)" value={statName} onChange={(e) => setStatName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" className="field-input" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} required />
            <input className="field-input" placeholder="Unit (optional, e.g. sec, lbs)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {grouped.length === 0 ? (
        <div className="card">
          <EmptyState title="No stats logged yet" description="Use Log a stat above to start tracking your numbers over time." />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => {
            const latest = g.list[g.list.length - 1];
            const values = g.list.map((e) => e.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const recent = g.list.slice(-10);
            const direction = PR_DIRECTION[g.name];
            // Only a record if there's a real prior entry to beat — the
            // first-ever entry for a stat is a baseline, not an improvement.
            const isNewPr =
              g.list.length > 1 &&
              direction !== undefined &&
              ((direction === "lower" && latest.value <= min) ||
                (direction === "higher" && latest.value >= max));
            return (
              <div key={g.name} className="card p-5">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{g.name}</div>
                    {isNewPr && (
                      <span className="badge badge-live" title="Your best recorded value for this stat">
                        New PR
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-semibold font-heading">
                    {latest.value}
                    {latest.unit && <span className="text-sm text-text-2 ml-1">{latest.unit}</span>}
                  </div>
                </div>
                {recent.length > 1 && (
                  <div className="flex items-end gap-1 h-10 mb-3">
                    {recent.map((e) => {
                      const range = max - min || 1;
                      const height = 15 + ((e.value - min) / range) * 85;
                      return (
                        <div
                          key={e.id}
                          className="flex-1 rounded-sm"
                          style={{ height: `${height}%`, background: "var(--grad-signal)" }}
                          title={`${e.value}${e.unit ?? ""} — ${new Date(e.recordedAt).toLocaleDateString()}`}
                        />
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-between mono text-text-3">
                  <span>Lowest recorded: {min}{latest.unit}</span>
                  <span>Highest recorded: {max}{latest.unit}</span>
                  <span>{g.list.length} entries</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
