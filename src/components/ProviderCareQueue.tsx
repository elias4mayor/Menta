"use client";

import { useEffect, useState } from "react";
import { CARE_REASON_LABELS, CARE_STATUS_LABELS, type CareReason, type CareStatus } from "@/lib/care";

type CareRequestRecord = {
  id: string;
  reason: string;
  reasonNote: string | null;
  status: string;
  requestedStart: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  providerNote: string | null;
  athlete: { id: string; name: string };
  team: { id: string; name: string };
};

function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

export function ProviderCareQueue() {
  const [requests, setRequests] = useState<CareRequestRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [times, setTimes] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/care/requests");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function act(id: string, action: string, extra?: Record<string, string>) {
    setError(null);
    const res = await fetch(`/api/care/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    await load();
  }

  function accept(r: CareRequestRecord) {
    const start = times[r.id] || r.requestedStart.slice(0, 16);
    const startIso = new Date(start).toISOString();
    const endIso = addMinutes(startIso, 30);
    act(r.id, "ACCEPT", { scheduledStart: startIso, scheduledEnd: new Date(endIso).toISOString() });
  }

  if (requests === null) return <p className="text-text-2 text-sm">Loading…</p>;

  const pending = requests.filter((r) => r.status === "REQUESTED");
  const upcoming = requests.filter((r) => r.status === "SCHEDULED" || r.status === "FOLLOW_UP");
  const past = requests.filter((r) => ["SEEN", "CLOSED", "DECLINED", "CANCELLED"].includes(r.status));

  return (
    <div className="space-y-8">
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <section>
        <div className="mono text-text-3 mb-3">Pending requests ({pending.length})</div>
        {pending.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing waiting on you.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{r.athlete.name}</span>
                  <span className="mono text-text-3 text-xs">{CARE_REASON_LABELS[r.reason as CareReason]}</span>
                </div>
                {r.reasonNote && <p className="text-text-2 text-sm mb-2">{r.reasonNote}</p>}
                <p className="text-text-3 text-xs mb-3">Requested for {new Date(r.requestedStart).toLocaleString()}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    className="field-input"
                    style={{ width: "auto" }}
                    value={times[r.id] ?? r.requestedStart.slice(0, 16)}
                    onChange={(e) => setTimes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <button type="button" className="btn-secondary" onClick={() => accept(r)}>Accept</button>
                  <button type="button" className="text-xs text-text-3 hover:text-text-2" onClick={() => act(r.id, "DECLINE")}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mono text-text-3 mb-3">Upcoming ({upcoming.length})</div>
        {upcoming.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{r.athlete.name}</span>
                  <span className="mono text-text-3 text-xs">{r.scheduledStart && new Date(r.scheduledStart).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => act(r.id, "SEEN")}>Mark seen</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const start = prompt("New date/time (YYYY-MM-DDTHH:mm)", r.scheduledStart?.slice(0, 16) ?? "");
                      if (!start) return;
                      const startIso = new Date(start).toISOString();
                      act(r.id, "RESCHEDULE", { scheduledStart: startIso, scheduledEnd: addMinutes(startIso, 30) });
                    }}
                  >
                    Reschedule
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mono text-text-3 mb-3">Past ({past.length})</div>
        {past.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {past.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>{r.athlete.name} — {CARE_REASON_LABELS[r.reason as CareReason]}</span>
                <span className="mono text-text-3">{CARE_STATUS_LABELS[r.status as CareStatus]}</span>
                {r.status === "SEEN" && (
                  <button
                    type="button"
                    className="text-xs text-text-3 hover:text-text-2"
                    onClick={() => {
                      const start = prompt("Follow-up date/time (YYYY-MM-DDTHH:mm)");
                      if (!start) return;
                      act(r.id, "FOLLOW_UP", { followUpStart: new Date(start).toISOString() });
                    }}
                  >
                    Schedule follow-up
                  </button>
                )}
                {r.status !== "CLOSED" && r.status === "SEEN" && (
                  <button type="button" className="text-xs text-text-3 hover:text-text-2" onClick={() => act(r.id, "CLOSE")}>
                    Close
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
