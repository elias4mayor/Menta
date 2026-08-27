"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type Playlist = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  teamName: string | null;
  positionGroupName: string | null;
  itemCount: number;
  isMine: boolean;
  createdAt: string;
};

export function PlaylistsManager({ initialPlaylists }: { initialPlaylists: Playlist[] }) {
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create playlist.");
        return;
      }
      setPlaylists((p) => [
        {
          id: data.playlist.id,
          title: data.playlist.title,
          description: data.playlist.description,
          visibility: data.playlist.visibility,
          teamName: null,
          positionGroupName: null,
          itemCount: 0,
          isMine: true,
          createdAt: new Date().toISOString(),
        },
        ...p,
      ]);
      setTitle("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New playlist"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-5 space-y-3 mb-6">
          <input className="field-input" placeholder="Playlist title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Creating…" : "Create playlist"}
          </button>
        </form>
      )}

      {playlists.length === 0 ? (
        <div className="card">
          <EmptyState title="No playlists yet" description="Group film and clips together for review, scouting, or study." />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {playlists.map((p) => (
            <Link key={p.id} href={`/playlists/${p.id}`} className="card p-5 block hover:border-[var(--border-strong)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge">{p.visibility}</span>
                {p.teamName && <span className="badge">{p.teamName}</span>}
                {p.positionGroupName && <span className="badge">{p.positionGroupName}</span>}
              </div>
              <div className="font-medium mb-1">{p.title}</div>
              <p className="mono text-text-3">{p.itemCount} item{p.itemCount === 1 ? "" : "s"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
