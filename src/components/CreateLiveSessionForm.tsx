"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Athlete = { id: string; name: string };
type GroupDraft = { key: string; name: string; athleteIds: Set<string> };

let keyCounter = 0;

/**
 * "Who's training?" first, station grouping only if the coach opts in —
 * a coach starting a simple session should never have to think about
 * groups at all. Default behavior with stations off is exactly one
 * implicit group ("Everyone") containing whoever's selected, handled
 * server-side by createLiveSession() when athleteIds (not groups) is
 * sent. The submit button stays disabled until at least one athlete is
 * selected, so the raw "Too small: expected array to have >=1 items"
 * Zod message a coach hit before is now structurally unreachable from
 * this form — the friendly fallback message in validation.ts only
 * matters if something bypasses this UI entirely (e.g. a stale tab).
 */
export function CreateLiveSessionForm({
  teamId,
  programId,
  defaultTitle,
  roster,
}: {
  teamId: string;
  programId: string;
  defaultTitle: string;
  roster: Athlete[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [useStations, setUseStations] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(roster.map((a) => a.id)));
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAthlete(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(roster.map((a) => a.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  function addGroup() {
    keyCounter += 1;
    setGroups((g) => [...g, { key: `g-${keyCounter}`, name: `Group ${String.fromCharCode(65 + g.length)}`, athleteIds: new Set() }]);
  }

  function toggleInGroup(groupKey: string, athleteId: string) {
    setGroups((gs) =>
      gs.map((g) => {
        if (g.key !== groupKey) return g;
        const next = new Set(g.athleteIds);
        if (next.has(athleteId)) next.delete(athleteId);
        else next.add(athleteId);
        return { ...g, athleteIds: next };
      })
    );
  }

  function assignedElsewhere(groupKey: string, athleteId: string): boolean {
    return groups.some((g) => g.key !== groupKey && g.athleteIds.has(athleteId));
  }

  const totalGroupedAthletes = groups.reduce((sum, g) => sum + g.athleteIds.size, 0);
  const canSubmit = useStations ? groups.some((g) => g.athleteIds.size > 0) : selected.size > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const body = useStations
        ? { title: title.trim(), groups: groups.filter((g) => g.athleteIds.size > 0).map((g) => ({ name: g.name, athleteIds: Array.from(g.athleteIds) })) }
        : { title: title.trim(), athleteIds: Array.from(selected) };

      const res = await fetch(`/api/teams/${teamId}/programs/${programId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // The API already carries a friendly message for every validation
        // case (see validation.ts) — this is a last-resort fallback only,
        // never a raw Zod/technical string.
        setError(data.error && !/^[A-Za-z_]+Error:/.test(data.error) ? data.error : "Something went wrong. Try again.");
        return;
      }
      router.push(`/team/${teamId}/sessions/${data.session.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={useStations} onChange={(e) => setUseStations(e.target.checked)} />
        Split into stations
      </label>

      {!useStations ? (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="mono text-text-3 text-xs">Who&rsquo;s training?</div>
            <div className="flex items-center gap-3 text-xs">
              <button type="button" className="text-text-2 hover:text-text-1" onClick={selectAll}>
                Select all
              </button>
              <button type="button" className="text-text-2 hover:text-text-1" onClick={selectNone}>
                Select none
              </button>
            </div>
          </div>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto mb-3">
            {roster.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleAthlete(a.id)} />
                {a.name}
              </li>
            ))}
          </ul>
          <div className="mono text-text-3 text-xs">
            {selected.size} athlete{selected.size === 1 ? "" : "s"} selected
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-text-3 text-xs">
            {groups.length === 0
              ? "No stations yet — add one below, or turn this off for one group with everyone."
              : `${totalGroupedAthletes} athlete${totalGroupedAthletes === 1 ? "" : "s"} assigned across ${groups.length} station${groups.length === 1 ? "" : "s"}`}
          </p>
          {groups.map((g) => (
            <div key={g.key} className="card p-4">
              <input
                className="field-input mb-2 text-sm"
                value={g.name}
                onChange={(e) => setGroups((gs) => gs.map((x) => (x.key === g.key ? { ...x, name: e.target.value } : x)))}
              />
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {roster.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={g.athleteIds.has(a.id)}
                      disabled={assignedElsewhere(g.key, a.id)}
                      onChange={() => toggleInGroup(g.key, a.id)}
                    />
                    <span className={assignedElsewhere(g.key, a.id) ? "text-text-3" : ""}>{a.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button type="button" className="btn-secondary text-xs" onClick={addGroup}>
            + Add station
          </button>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving || !canSubmit}>
        {saving ? "Creating…" : "Create session"}
      </button>
      {!canSubmit && <p className="text-text-3 text-xs">Select at least one athlete to continue.</p>}
    </form>
  );
}
