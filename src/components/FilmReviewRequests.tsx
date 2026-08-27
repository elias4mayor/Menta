"use client";

import { useState } from "react";

export type ReviewRequestItem = {
  id: string;
  timestampSec: number | null;
  question: string;
  status: string;
  response: string | null;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FilmReviewRequests({
  filmId,
  initialRequests,
  currentTime,
}: {
  filmId: string;
  initialRequests: ReviewRequestItem[];
  currentTime: () => number;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [question, setQuestion] = useState("");
  const [tagTimestamp, setTagTimestamp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/films/${filmId}/review-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, timestampSec: tagTimestamp ? currentTime() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send question.");
        return;
      }
      setRequests((r) => [data.request, ...r]);
      setQuestion("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6 mb-6">
      <div className="mono text-text-3 mb-4">Ask your coach ({requests.length})</div>

      {requests.length > 0 && (
        <ul className="space-y-3 mb-4">
          {requests.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.question}</span>
                {r.timestampSec !== null && <span className="mono text-text-3 text-xs">@ {formatTime(r.timestampSec)}</span>}
                <span className="badge">{r.status}</span>
              </div>
              {r.response && <p className="text-text-2 mt-1">{r.response}</p>}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <textarea className="field-textarea" rows={2} placeholder="Ask a question about this film…" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-text-3">
            <input type="checkbox" checked={tagTimestamp} onChange={(e) => setTagTimestamp(e.target.checked)} />
            Tag current timestamp
          </label>
          <button type="submit" disabled={saving || !question.trim()} className="btn-primary">
            {saving ? "Sending…" : "Ask"}
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      </form>
    </section>
  );
}
