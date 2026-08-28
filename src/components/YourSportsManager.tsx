"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { SPORTS, rolesForSport, roleLabel } from "@/lib/sports";

type SportContext = {
  id: string;
  sport: string;
  position: string | null;
  isPrimary: boolean;
  isActive: boolean;
};

/**
 * Full CRUD over AthleteSportContext — add a sport, switch primary,
 * deactivate (never hard-delete, so history stays intact), and reactivate
 * a sport removed earlier. The Sport Switcher in the topbar only shows
 * active sports and a quick primary switch; this is the one place an
 * athlete can see (and undo) everything, including sports they removed.
 */
export function YourSportsManager() {
  const router = useRouter();
  const [contexts, setContexts] = useState<SportContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newSport, setNewSport] = useState("");
  const [newPosition, setNewPosition] = useState("");

  async function load() {
    const res = await fetch("/api/athlete/sport-contexts");
    if (res.ok) {
      const data = await res.json();
      setContexts(data.sportContexts);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function makePrimary(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/athlete/sport-contexts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }
    await load();
    setBusyId(null);
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/athlete/sport-contexts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }
    await load();
    setBusyId(null);
  }

  async function reactivate(context: SportContext) {
    setBusyId(context.id);
    setError(null);
    const res = await fetch("/api/athlete/sport-contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sport: context.sport, position: context.position || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }
    await load();
    setBusyId(null);
  }

  async function addSport() {
    if (!newSport) return;
    setError(null);
    const res = await fetch("/api/athlete/sport-contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sport: newSport, position: newPosition || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setNewSport("");
    setNewPosition("");
    setAdding(false);
    router.refresh();
    await load();
  }

  if (contexts === null) return null;

  const active = contexts.filter((c) => c.isActive);
  const inactive = contexts.filter((c) => !c.isActive);

  return (
    <div id="your-sports" className="card p-5 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Your sports</h2>
        {!adding && (
          <button type="button" className="text-sm text-text-2 hover:text-text-1" onClick={() => setAdding(true)}>
            + Add sport
          </button>
        )}
      </div>

      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

      <ul className="space-y-2">
        {active.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <div>
              <span className="font-medium">{c.sport}</span>
              {c.position && <span className="text-text-2"> · {c.position}</span>}
              {c.isPrimary && <span className="badge ml-2">Primary</span>}
            </div>
            <div className="flex items-center gap-3">
              {!c.isPrimary && (
                <button
                  type="button"
                  className="text-xs text-text-3 hover:text-text-2"
                  disabled={busyId === c.id}
                  onClick={() => makePrimary(c.id)}
                >
                  Make primary
                </button>
              )}
              <button
                type="button"
                className="text-xs text-text-3 hover:text-text-2"
                disabled={busyId === c.id}
                onClick={() => remove(c.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="space-y-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="your-sports-new-sport"
              value={newSport}
              onChange={(v) => {
                setNewSport(v);
                if (!rolesForSport(v).includes(newPosition)) setNewPosition("");
              }}
              placeholder="Sport"
              options={SPORTS.map((s) => ({ value: s.name, label: s.name }))}
            />
            {newSport &&
              (rolesForSport(newSport).length > 0 ? (
                <Select
                  id="your-sports-new-position"
                  value={newPosition}
                  onChange={setNewPosition}
                  placeholder={roleLabel(newSport)}
                  options={rolesForSport(newSport).map((p) => ({ value: p, label: p }))}
                />
              ) : (
                <input
                  className="field-input"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder={roleLabel(newSport)}
                />
              ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={!newSport} onClick={addSport}>
              Add
            </button>
            <button
              type="button"
              className="text-sm text-text-3 hover:text-text-2"
              onClick={() => {
                setAdding(false);
                setNewSport("");
                setNewPosition("");
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <div className="mono text-text-3 text-xs mb-2">Removed</div>
          <ul className="space-y-2">
            {inactive.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-text-3">
                  {c.sport}
                  {c.position ? ` · ${c.position}` : ""}
                </span>
                <button
                  type="button"
                  className="text-xs text-text-3 hover:text-text-2"
                  disabled={busyId === c.id}
                  onClick={() => reactivate(c)}
                >
                  Reactivate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
