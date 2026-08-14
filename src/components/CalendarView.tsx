"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventItem = {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  teamName: string | null;
};

export function CalendarView({
  initialEvents,
  manageableTeams,
}: {
  initialEvents: EventItem[];
  manageableTeams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = groupByDay(initialEvents);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startsAt: new Date(startsAt).toISOString(),
          location: location || undefined,
          teamId: teamId || undefined,
          visibility: teamId ? "TEAM" : "PRIVATE",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create event.");
        return;
      }
      setTitle("");
      setStartsAt("");
      setLocation("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
          <input className="field-input" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input type="datetime-local" className="field-input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          <input className="field-input" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          {manageableTeams.length > 0 && (
            <select className="field-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Personal event</option>
              {manageableTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} (team)</option>
              ))}
            </select>
          )}
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : "Save event"}
          </button>
        </form>
      )}

      {grouped.length === 0 ? (
        <div className="card p-6">
          <p className="text-text-2 text-sm">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, events]) => (
            <div key={day}>
              <div className="mono text-text-3 mb-2">{day}</div>
              <div className="card divide-y divide-[var(--border)]">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div>{e.title}</div>
                      {e.location && <div className="text-text-3 text-xs mt-0.5">{e.location}</div>}
                    </div>
                    <div className="text-right">
                      <div className="mono text-text-3">
                        {new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      {e.teamName && <span className="badge mt-1">{e.teamName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(events: EventItem[]): [string, EventItem[]][] {
  const map = new Map<string, EventItem[]>();
  for (const e of events) {
    const key = new Date(e.startsAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}
