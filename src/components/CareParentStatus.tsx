"use client";

import { useEffect, useState } from "react";

type StatusRow = { id: string; statusLabel: string; scheduledStart: string | null };

/** Read-only, status-only view for a parent — never the reason, note, or provider's private note (see /api/care/requests?mode=athlete-status). */
export function CareParentStatus({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const [rows, setRows] = useState<StatusRow[] | null>(null);

  useEffect(() => {
    fetch(`/api/care/requests?mode=athlete-status&athleteId=${athleteId}`)
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data) => setRows(data.requests));
  }, [athleteId]);

  return (
    <div className="card p-5">
      <div className="mono text-text-3 mb-3">{athleteName} — Care</div>
      {rows === null ? (
        <p className="text-text-2 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-text-2 text-sm">No care activity.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span>{r.statusLabel}</span>
              {r.scheduledStart && <span className="mono text-text-3">{new Date(r.scheduledStart).toLocaleString()}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
