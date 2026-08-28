"use client";

import { useState } from "react";

export type FilmCommentItem = {
  id: string;
  clipId: string | null;
  authorId: string;
  authorName: string;
  timestampSec: number | null;
  body: string;
  visibility: string;
  parentId: string | null;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FilmComments({
  filmId,
  initialComments,
  canLeavePrivate,
  currentTime,
  onSeek,
}: {
  filmId: string;
  initialComments: FilmCommentItem[];
  canLeavePrivate: boolean;
  currentTime: () => number;
  onSeek: (sec: number) => void;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [tagTimestamp, setTagTimestamp] = useState(true);
  const [visibility, setVisibility] = useState<"SHARED" | "PRIVATE">("SHARED");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/films/${filmId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          timestampSec: !replyTo && tagTimestamp ? currentTime() : undefined,
          parentId: replyTo,
          visibility: replyTo ? "SHARED" : visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't post comment.");
        return;
      }
      setComments((c) => [...c, data.comment]);
      setBody("");
      setReplyTo(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setComments((c) => c.filter((x) => x.id !== id && x.parentId !== id));
    await fetch(`/api/films/${filmId}/comments/${id}`, { method: "DELETE" });
  }

  function Comment({ c }: { c: FilmCommentItem }) {
    return (
      <li className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-sm">{c.authorName}</span>
          {c.timestampSec !== null && (
            <button type="button" className="mono text-text-3 text-xs hover:text-text-1" onClick={() => onSeek(c.timestampSec!)}>
              @ {formatTime(c.timestampSec)}
            </button>
          )}
          {c.visibility === "PRIVATE" && <span className="badge">Private</span>}
        </div>
        <p className="text-sm">{c.body}</p>
        <div className="flex items-center gap-3 text-xs text-text-3">
          <button type="button" className="hover:text-text-1" onClick={() => setReplyTo(c.id)}>
            Reply
          </button>
          {c.isMine && (
            <button type="button" className="hover:text-text-1" onClick={() => remove(c.id)}>
              Delete
            </button>
          )}
        </div>
        {repliesOf(c.id).length > 0 && (
          <ul className="ml-4 pl-3 space-y-2 mt-2" style={{ borderLeft: "1px solid var(--border)" }}>
            {repliesOf(c.id).map((r) => (
              <Comment key={r.id} c={r} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <section className="card p-5 sm:p-6 mb-6">
      <div className="mono text-text-3 mb-4">Comments ({comments.length})</div>

      {topLevel.length === 0 ? (
        <p className="text-text-2 text-sm mb-4">No comments yet — leave feedback tied to a moment in the film.</p>
      ) : (
        <ul className="space-y-4 mb-5">
          {topLevel.map((c) => (
            <Comment key={c.id} c={c} />
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-text-3">
            <span>Replying…</span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-text-1">
              Cancel
            </button>
          </div>
        )}
        <textarea
          className="field-textarea"
          rows={2}
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          {!replyTo && (
            <label className="flex items-center gap-2 text-xs text-text-3">
              <input type="checkbox" checked={tagTimestamp} onChange={(e) => setTagTimestamp(e.target.checked)} />
              Tag current timestamp
            </label>
          )}
          <div className="flex items-center gap-2">
            {!replyTo && canLeavePrivate && (
              <select className="field-select" value={visibility} onChange={(e) => setVisibility(e.target.value as "SHARED" | "PRIVATE")}>
                <option value="SHARED">Shared</option>
                <option value="PRIVATE">Private (staff only)</option>
              </select>
            )}
            <button type="submit" disabled={saving || !body.trim()} className="btn-primary">
              {saving ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      </form>
    </section>
  );
}
