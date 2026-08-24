"use client";

import { useEffect, useState } from "react";

type Team = { id: string; name: string };
type Window = { id: string; teamId: string; dayOfWeek: number; startMinute: number; endMinute: number; slotMinutes: number; team: { name: string } };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function ProviderAvailabilityManager({ teams }: { teams: Team[] }) {
  const [windows, setWindows] = useState<Window[] | null>(null);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/care/provider-availability");
    if (res.ok) {
      const data = await res.json();
      setWindows(data.windows);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function addWindow() {
    setError(null);
    const res = await fetch("/api/care/provider-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        dayOfWeek,
        startMinute: timeToMinutes(start),
        endMinute: timeToMinutes(end),
        slotMinutes: 30,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/care/provider-availability/${id}`, { method: "DELETE" });
    await load();
  }

  if (teams.length === 0) {
    return <p className="text-text-2 text-sm">Join a team as a verified provider to set availability.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="field-select" style={{ width: "auto" }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select className="field-select" style={{ width: "auto" }} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
          {DAYS.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <input type="time" className="field-input" style={{ width: "auto" }} value={start} onChange={(e) => setStart(e.target.value)} />
        <span className="text-text-3 text-sm">to</span>
        <input type="time" className="field-input" style={{ width: "auto" }} value={end} onChange={(e) => setEnd(e.target.value)} />
        <button type="button" className="btn-secondary" onClick={addWindow}>Add</button>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {windows === null ? (
        <p className="text-text-2 text-sm">Loading…</p>
      ) : windows.length === 0 ? (
        <p className="text-text-2 text-sm">No availability set yet — athletes won&rsquo;t see any open times until you add some.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {windows.map((w) => (
            <li key={w.id} className="flex items-center justify-between">
              <span>{w.team.name} — {DAYS[w.dayOfWeek]} {minutesToTime(w.startMinute)}–{minutesToTime(w.endMinute)}</span>
              <button type="button" className="text-xs text-text-3 hover:text-text-2" onClick={() => remove(w.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
