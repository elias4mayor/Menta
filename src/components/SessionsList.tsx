"use client";

import { useEffect, useState } from "react";

type SessionItem = { id: string; userAgent: string | null; createdAt: string; expiresAt: string };

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);

  useEffect(() => {
    fetch("/api/settings/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, []);

  async function revoke(id: string) {
    await fetch("/api/settings/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    setSessions((prev) => prev?.filter((s) => s.id !== id) ?? null);
  }

  if (!sessions) return <p className="text-text-2 text-sm">Loading…</p>;

  return (
    <ul className="space-y-2 text-sm">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center justify-between">
          <span className="text-text-2">
            {s.userAgent ? s.userAgent.slice(0, 60) : "Unknown device"} · since{" "}
            {new Date(s.createdAt).toLocaleDateString()}
          </span>
          <button onClick={() => revoke(s.id)} className="text-xs text-text-3 hover:text-text-1">
            Sign out
          </button>
        </li>
      ))}
    </ul>
  );
}
