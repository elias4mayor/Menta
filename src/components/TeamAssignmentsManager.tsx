"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";

type Assignment = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  positionGroupName: string | null;
  filmTitle: string | null;
  playlistTitle: string | null;
  clipLabel: string | null;
  targetCount: number;
  completedCount: number;
};

export function TeamAssignmentsManager({
  teamId,
  groups,
  initialAssignments,
}: {
  teamId: string;
  groups: { id: string; name: string }[];
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [filmId, setFilmId] = useState("");
  const [positionGroupId, setPositionGroupId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !filmId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          instructions: instructions.trim() || undefined,
          filmId: filmId.trim(),
          positionGroupId: positionGroupId || undefined,
          dueAt: dueAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create assignment.");
        return;
      }
      setAssignments((a) => [
        {
          id: data.assignment.id,
          title: data.assignment.title,
          instructions: data.assignment.instructions,
          dueAt: data.assignment.dueAt,
          positionGroupName: groups.find((g) => g.id === positionGroupId)?.name ?? null,
          filmTitle: null,
          playlistTitle: null,
          clipLabel: null,
          targetCount: 0,
          completedCount: 0,
        },
        ...a,
      ]);
      setTitle("");
      setInstructions("");
      setFilmId("");
      setPositionGroupId("");
      setDueAt("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setAssignments((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/assignments/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New assignment"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-5 space-y-3 mb-6">
          <input className="field-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="field-textarea" rows={2} placeholder="Instructions (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <input className="field-input" placeholder="Film ID to assign" value={filmId} onChange={(e) => setFilmId(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <select className="field-select" value={positionGroupId} onChange={(e) => setPositionGroupId(e.target.value)}>
              <option value="">Whole team</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input className="field-input" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Creating…" : "Create assignment"}
          </button>
        </form>
      )}

      {assignments.length === 0 ? (
        <div className="card">
          <EmptyState title="No assignments yet" description="Assign film to your team or a position group." />
        </div>
      ) : (
        <ul className="space-y-3">
          {assignments.map((a) => (
            <li key={a.id} className="card p-5">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="font-medium">{a.title}</div>
                <button className="text-xs text-text-3 hover:text-text-1" onClick={() => remove(a.id)}>
                  Delete
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {a.positionGroupName && <span className="badge">{a.positionGroupName}</span>}
                {a.dueAt && <span className="badge">Due {new Date(a.dueAt).toLocaleDateString()}</span>}
              </div>
              <p className="mono text-text-3 text-xs">
                {a.completedCount}/{a.targetCount} completed
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
