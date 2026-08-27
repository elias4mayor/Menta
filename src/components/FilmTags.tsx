"use client";

import { useState } from "react";

export type TagDefinition = { id: string; label: string; category: string | null };
export type FilmTagItem = {
  id: string;
  clipId: string | null;
  label: string;
  category: string | null;
  timestampSec: number | null;
  athleteId: string | null;
  notes: string | null;
  createdById: string;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FilmTags({
  filmId,
  teamId,
  canTag,
  canManageDefinitions,
  initialDefinitions,
  initialTags,
  currentTime,
  onSeek,
}: {
  filmId: string;
  teamId: string;
  canTag: boolean;
  canManageDefinitions: boolean;
  initialDefinitions: TagDefinition[];
  initialTags: FilmTagItem[];
  currentTime: () => number;
  onSeek: (sec: number) => void;
}) {
  const [definitions, setDefinitions] = useState(initialDefinitions);
  const [tags, setTags] = useState(initialTags);
  const [selectedDef, setSelectedDef] = useState(definitions[0]?.id ?? "");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addDefinition(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/tag-definitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create tag.");
        return;
      }
      setDefinitions((d) => [...d, data.definition]);
      setSelectedDef(data.definition.id);
      setNewLabel("");
    } finally {
      setSaving(false);
    }
  }

  async function addTagInstance() {
    if (!selectedDef) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/films/${filmId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagDefinitionId: selectedDef, timestampSec: currentTime() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't tag this moment.");
        return;
      }
      setTags((t) => [...t, data.tag].sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0)));
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(id: string) {
    setTags((t) => t.filter((x) => x.id !== id));
    await fetch(`/api/films/${filmId}/tags/${id}`, { method: "DELETE" });
  }

  if (!canTag && tags.length === 0) return null;

  return (
    <section className="card p-5 sm:p-6 mb-6">
      <div className="mono text-text-3 mb-4">Tagged moments ({tags.length})</div>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-4">
          {tags.map((t) => (
            <li key={t.id} className="badge flex items-center gap-2">
              <button type="button" onClick={() => t.timestampSec !== null && onSeek(t.timestampSec)}>
                {t.label}
                {t.timestampSec !== null && ` @ ${formatTime(t.timestampSec)}`}
              </button>
              {canTag && (
                <button type="button" className="text-text-3 hover:text-text-1" onClick={() => removeTag(t.id)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-2 text-sm mb-4">No tagged moments yet.</p>
      )}

      {canTag && (
        <div className="flex flex-wrap gap-2 items-center">
          {definitions.length > 0 && (
            <>
              <select className="field-select" value={selectedDef} onChange={(e) => setSelectedDef(e.target.value)}>
                {definitions.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <button type="button" className="btn-secondary" disabled={saving} onClick={addTagInstance}>
                Tag current moment
              </button>
            </>
          )}
        </div>
      )}

      {canManageDefinitions && (
        <form onSubmit={addDefinition} className="flex gap-2 mt-3 max-w-sm">
          <input
            className="field-input"
            placeholder="New tag label (e.g. Blitz, 3PT)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button type="submit" className="btn-secondary shrink-0" disabled={saving}>
            Add tag type
          </button>
        </form>
      )}
      {error && (
        <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
