"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type ReviewRequest = {
  id: string;
  filmId: string;
  filmTitle: string;
  athleteName: string;
  timestampSec: number | null;
  question: string;
  status: string;
  response: string | null;
  createdAt: string;
};

export function ReviewRequestsInbox({ initialRequests }: { initialRequests: ReviewRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function respond(id: string) {
    const response = (drafts[id] ?? "").trim();
    if (!response) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/review-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequests((r) => r.map((x) => (x.id === id ? { ...x, status: "ANSWERED", response: data.request.response } : x)));
      }
    } finally {
      setSaving(null);
    }
  }

  const open = requests.filter((r) => r.status === "OPEN");
  const answered = requests.filter((r) => r.status !== "OPEN");

  if (requests.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No questions yet" description="Athlete questions about film will show up here." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mono text-text-3 mb-3">Open ({open.length})</div>
        {open.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing waiting on a response.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="text-sm text-text-3 mb-1">{r.athleteName} on <Link href={`/film/${r.filmId}`} className="underline">{r.filmTitle}</Link></div>
                <p className="text-sm mb-3">{r.question}</p>
                <textarea
                  className="field-textarea mb-2"
                  rows={2}
                  placeholder="Respond…"
                  value={drafts[r.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                />
                <button className="btn-primary" disabled={saving === r.id} onClick={() => respond(r.id)}>
                  {saving === r.id ? "Sending…" : "Respond"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {answered.length > 0 && (
        <div>
          <div className="mono text-text-3 mb-3">Answered ({answered.length})</div>
          <ul className="space-y-3">
            {answered.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="text-sm text-text-3 mb-1">{r.athleteName} on <Link href={`/film/${r.filmId}`} className="underline">{r.filmTitle}</Link></div>
                <p className="text-sm mb-2">{r.question}</p>
                <p className="text-sm text-text-2">{r.response}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
