"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type Item = {
  id: string;
  order: number;
  note: string | null;
  filmId: string | null;
  filmTitle: string | null;
  clipId: string | null;
  clipLabel: string | null;
  clipFilmId: string | null;
};

export function PlaylistDetail({
  playlistId,
  canManage,
  initialItems,
}: {
  playlistId: string;
  canManage: boolean;
  initialItems: Item[];
}) {
  const [items, setItems] = useState(initialItems);
  const [filmId, setFilmId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addFilm(e: React.FormEvent) {
    e.preventDefault();
    if (!filmId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: filmId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that film.");
        return;
      }
      setItems((it) => [...it, { ...data.item, filmTitle: null, clipTitle: null }]);
      setFilmId("");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(itemId: string) {
    setItems((it) => it.filter((i) => i.id !== itemId));
    await fetch(`/api/playlists/${playlistId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
  }

  return (
    <div>
      {items.length === 0 ? (
        <div className="card mb-6">
          <EmptyState title="No items yet" description="Add film from your library to build this playlist." />
        </div>
      ) : (
        <ul className="space-y-2 mb-6">
          {items.map((i) => (
            <li key={i.id} className="card p-4 flex items-center justify-between">
              <Link href={`/film/${i.filmId ?? i.clipFilmId}`} className="text-sm hover:underline">
                {i.filmTitle ?? i.clipLabel ?? "Film"}
              </Link>
              {canManage && (
                <button className="text-xs text-text-3 hover:text-text-1" onClick={() => removeItem(i.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={addFilm} className="card p-5 space-y-3">
          <div className="mono text-text-3">Add film by ID</div>
          <p className="text-text-2 text-xs">
            Paste a film&rsquo;s ID from your <Link href="/film" className="underline">film library</Link>.
          </p>
          <div className="flex gap-2">
            <input className="field-input" placeholder="Film ID" value={filmId} onChange={(e) => setFilmId(e.target.value)} />
            <button type="submit" disabled={saving} className="btn-secondary shrink-0">Add</button>
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
