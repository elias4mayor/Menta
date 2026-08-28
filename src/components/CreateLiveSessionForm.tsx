"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Athlete = { id: string; name: string };
type GroupDraft = { key: string; name: string; athleteIds: Set<string> };

let keyCounter = 0;

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
        setError(data.error ?? "Couldn't create the session.");
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
        Split into stations/groups
      </label>

      {!useStations ? (
        <div className="card p-4">
          <div className="mono text-text-3 text-xs mb-2">ATHLETES</div>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {roster.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleAthlete(a.id)} />
                {a.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
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
            + Add group
          </button>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Creating…" : "Create session"}
      </button>
    </form>
  );
}
