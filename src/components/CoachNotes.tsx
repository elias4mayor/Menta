"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";

type Note = {
  id: string;
  coachId: string;
  coachName: string;
  body: string;
  filmId: string | null;
  filmTitle: string | null;
  createdAt: string;
  isMine: boolean;
};

export function CoachNotes({
  teamId,
  athleteId,
  initialNotes,
}: {
  teamId: string;
  athleteId: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/athletes/${athleteId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save note.");
        return;
      }
      setNotes((n) => [{ ...data.note, coachName: "You", filmTitle: null, isMine: true, createdAt: data.note.createdAt }, ...n]);
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await fetch(`/api/coach-notes/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
        <textarea className="field-textarea" rows={3} placeholder="Add a private note…" value={body} onChange={(e) => setBody(e.target.value)} />
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" disabled={saving || !body.trim()} className="btn-primary">
          {saving ? "Saving…" : "Add note"}
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="card">
          <EmptyState title="No notes yet" description="Longitudinal notes about this athlete, visible only to coaching staff." />
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-3">
                  {n.coachName} · {new Date(n.createdAt).toLocaleDateString()}
                  {n.filmTitle && ` · ${n.filmTitle}`}
                </span>
                {n.isMine && (
                  <button className="text-xs text-text-3 hover:text-text-1" onClick={() => remove(n.id)}>
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
