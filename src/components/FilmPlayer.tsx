"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Clip = {
  id: string;
  startSec: number;
  endSec: number | null;
  label: string;
  notes: string | null;
  createdByName: string;
  isMine: boolean;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FilmPlayer({
  film,
  initialClips,
  onVideoRef,
}: {
  film: { id: string; title: string; description: string | null; durationSec: number | null; isMine: boolean };
  initialClips: Clip[];
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clips, setClips] = useState(initialClips);
  const [marking, setMarking] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlightTitle, setHighlightTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startMarking() {
    const t = videoRef.current?.currentTime ?? 0;
    setClipStart(t);
    setClipEnd(null);
    setLabel("");
    setNotes("");
    setMarking(true);
  }

  function setEndToNow() {
    setClipEnd(videoRef.current?.currentTime ?? 0);
  }

  async function saveClip(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/films/${film.id}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startSec: clipStart,
          endSec: clipEnd ?? undefined,
          label,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save clip.");
        return;
      }
      setClips((c) =>
        [...c, { ...data.clip, createdByName: "You", isMine: true }].sort((a, b) => a.startSec - b.startSec)
      );
      setMarking(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteClip(id: string) {
    setClips((c) => c.filter((clip) => clip.id !== id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    await fetch(`/api/clips/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function seekTo(sec: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play();
    }
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createHighlight(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: highlightTitle, clipIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create highlight.");
        return;
      }
      router.push("/highlights");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFilm() {
    if (!confirm("Delete this film and all its clips? This can't be undone.")) return;
    await fetch(`/api/films/${film.id}`, { method: "DELETE" });
    router.push("/film");
  }

  async function onLoadedMetadata() {
    if (film.durationSec == null && videoRef.current) {
      await fetch(`/api/films/${film.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSec: videoRef.current.duration }),
      });
    }
  }

  return (
    <div>
      <div className="card overflow-hidden mb-4">
        <video
          ref={(el) => {
            videoRef.current = el;
            onVideoRef?.(el);
          }}
          src={`/api/films/${film.id}/video`}
          controls
          className="w-full bg-black"
          style={{ maxHeight: 480 }}
          onLoadedMetadata={onLoadedMetadata}
        />
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[0.5, 1, 1.5, 2].map((rate) => (
          <button
            key={rate}
            className="badge"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (videoRef.current) videoRef.current.playbackRate = rate;
            }}
          >
            {rate}×
          </button>
        ))}
        {!marking ? (
          <button className="btn-secondary" onClick={startMarking}>Mark clip here</button>
        ) : null}
        {film.isMine && (
          <button className="text-xs text-text-3 hover:text-text-1 ml-auto" onClick={deleteFilm}>
            Delete film
          </button>
        )}
      </div>

      {marking && (
        <form onSubmit={saveClip} className="card p-5 space-y-3 mb-6">
          <div className="mono text-text-3">
            Start: {formatTime(clipStart)}
            {clipEnd !== null && ` · End: ${formatTime(clipEnd)}`}
          </div>
          {clipEnd === null && (
            <button type="button" onClick={setEndToNow} className="btn-secondary">
              Set end to current time
            </button>
          )}
          <input className="field-input" placeholder="Label (e.g. Missed block, 3rd down)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <textarea className="field-textarea" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save clip"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setMarking(false)}>Cancel</button>
          </div>
        </form>
      )}

      {film.description && <p className="text-text-2 text-sm mb-6">{film.description}</p>}

      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3">Clips ({clips.length})</div>
        {selected.size > 0 && <span className="mono text-text-3">{selected.size} selected</span>}
      </div>

      {clips.length === 0 ? (
        <p className="text-text-2 text-sm mb-6">No clips yet. Play the film and mark moments as you watch.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {clips.map((c) => (
            <li key={c.id} className="card p-4 flex items-center gap-3">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
              <button className="text-left flex-1" onClick={() => seekTo(c.startSec)}>
                <div className="text-sm">{c.label}</div>
                {c.notes && <div className="text-text-3 text-xs mt-0.5">{c.notes}</div>}
              </button>
              <span className="mono text-text-3">{formatTime(c.startSec)}</span>
              {(c.isMine || film.isMine) && (
                <button onClick={() => deleteClip(c.id)} className="text-text-3 hover:text-text-1 text-xs">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {selected.size > 0 && (
        <form onSubmit={createHighlight} className="card p-5 space-y-3">
          <div className="mono text-text-3">Create highlight reel from {selected.size} clip{selected.size === 1 ? "" : "s"}</div>
          <input className="field-input" placeholder="Highlight reel title" value={highlightTitle} onChange={(e) => setHighlightTitle(e.target.value)} required />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Create highlight reel"}
          </button>
        </form>
      )}
    </div>
  );
}
