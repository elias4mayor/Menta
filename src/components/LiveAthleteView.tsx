"use client";

import { useEffect, useRef, useState } from "react";

type MyView = {
  session: { id: string; title: string; status: string };
  groupId?: string;
  exercise: { id: string; name: string; category: string } | null;
  prescribed?: {
    source: "prescription" | "default";
    load: number | null;
    loadUnit: string | null;
    loadPercent: number | null;
    reps: string | null;
    sets: number | null;
    restSec: number | null;
  };
  prefill?: { load: number | null; reps: number | null };
  setsCompleted?: number;
  totalSets?: number | null;
  nextSetNumber?: number;
  lastLoggedAt?: string | null;
};

function describePrescribed(p: NonNullable<MyView["prescribed"]>): string {
  const load = p.load != null ? `${p.load} ${p.loadUnit ?? "LB"}` : p.loadPercent != null ? `${p.loadPercent}%` : "—";
  const reps = p.reps ?? "—";
  return `${load} × ${reps}`;
}

/**
 * The fastest possible path, per the Phase 6 spec's clarification: the
 * resolved prescription is shown, actual load/reps are prefilled, RPE is
 * optional, and completing a set is one primary action. The rest
 * countdown is always recomputed from the server's loggedAt + restSec on
 * every tick — never a client-owned timer that could drift or reset
 * when the app is backgrounded.
 */
export function LiveAthleteView({
  teamId,
  sessionId,
  athleteId,
  initialView,
}: {
  teamId: string;
  sessionId: string;
  athleteId: string;
  initialView: MyView | null;
}) {
  const [view, setView] = useState<MyView | null>(initialView);
  const [notInSession, setNotInSession] = useState(initialView === null);
  const [loadInput, setLoadInput] = useState(initialView?.prefill?.load?.toString() ?? "");
  const [repsInput, setRepsInput] = useState(initialView?.prefill?.reps?.toString() ?? "");
  const [rpeInput, setRpeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastKey = useRef<string>(`${initialView?.exercise?.id ?? ""}:${initialView?.nextSetNumber ?? 0}`);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}/me`);
      if (cancelled) return;
      if (res.status === 404) {
        setNotInSession(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setView(data);
    }
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [teamId, sessionId]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!view?.exercise) return;
    const key = `${view.exercise.id}:${view.nextSetNumber ?? 0}`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      setLoadInput(view.prefill?.load?.toString() ?? "");
      setRepsInput(view.prefill?.reps?.toString() ?? "");
      setRpeInput("");
      setError(null);
    }
  }, [view]);

  async function completeSet() {
    if (!view?.exercise || !view.nextSetNumber) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          programExerciseId: view.exercise.id,
          groupId: view.groupId,
          setNumber: view.nextSetNumber,
          weight: loadInput.trim() ? Number(loadInput) : undefined,
          reps: repsInput.trim() ? Number(repsInput) : undefined,
          rpe: rpeInput.trim() ? Number(rpeInput) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't log that set.");
        return;
      }
      // Refresh immediately rather than waiting up to 4s for the next poll.
      const refreshed = await fetch(`/api/teams/${teamId}/sessions/${sessionId}/me`);
      if (refreshed.ok) setView(await refreshed.json());
    } finally {
      setSubmitting(false);
    }
  }

  if (notInSession) {
    return <CenterMessage title="You're not in this session" />;
  }
  if (!view) {
    return <CenterMessage title="Loading…" />;
  }
  if (view.session.status === "PAUSED") {
    return <CenterMessage title="Session paused" description="Your coach paused the room. Hang tight." />;
  }
  if (view.session.status === "COMPLETE") {
    return <CenterMessage title="Session complete" description="Nice work. Check Progress for how it went." />;
  }
  if (view.session.status === "CANCELED") {
    return <CenterMessage title="Session canceled" />;
  }
  if (view.session.status === "SCHEDULED") {
    return <CenterMessage title="Waiting for your coach" description="The session hasn't started yet." />;
  }
  if (!view.exercise || !view.prescribed) {
    return <CenterMessage title="No exercise assigned" description="Check with your coach." />;
  }

  const secondsSinceLog = view.lastLoggedAt ? (now - new Date(view.lastLoggedAt).getTime()) / 1000 : null;
  const restSec = view.prescribed.restSec ?? 0;
  const resting = secondsSinceLog != null && secondsSinceLog < restSec;
  const remaining = resting ? Math.ceil(restSec - (secondsSinceLog as number)) : 0;
  const done = view.totalSets != null && (view.setsCompleted ?? 0) >= view.totalSets;

  return (
    <div className="max-w-sm mx-auto min-h-[70vh] flex flex-col justify-center px-4">
      <div className="mono text-text-3 text-center mb-2">TODAY&apos;S WORKOUT</div>
      <h1 className="text-3xl font-semibold text-center mb-1">{view.exercise.name}</h1>
      <p className="text-text-2 text-center mb-8">
        SET {view.nextSetNumber} {view.totalSets ? `OF ${view.totalSets}` : ""}
      </p>

      <div className="card p-5 text-center mb-6">
        <div className="mono text-text-3 text-xs mb-1">
          PRESCRIBED {view.prescribed.source === "prescription" ? "· INDIVIDUALIZED" : ""}
        </div>
        <div className="text-2xl font-semibold">{describePrescribed(view.prescribed)}</div>
      </div>

      {done ? (
        <CenterMessage title="Exercise complete ✓" description="Waiting for your coach to advance the room." />
      ) : resting ? (
        <div className="text-center">
          <div className="mono text-text-3 text-xs mb-2">REST</div>
          <div className="text-5xl font-semibold mb-6">
            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}
          </div>
          <p className="text-text-2">Next: Set {view.nextSetNumber}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mono text-text-3 text-xs">LOAD</span>
              <input className="field-input text-lg text-center" value={loadInput} onChange={(e) => setLoadInput(e.target.value)} inputMode="decimal" />
            </label>
            <label className="block">
              <span className="mono text-text-3 text-xs">REPS</span>
              <input className="field-input text-lg text-center" value={repsInput} onChange={(e) => setRepsInput(e.target.value)} inputMode="numeric" />
            </label>
          </div>
          <label className="block">
            <span className="mono text-text-3 text-xs">RPE (optional)</span>
            <input className="field-input text-center" value={rpeInput} onChange={(e) => setRpeInput(e.target.value)} inputMode="decimal" />
          </label>
          {error && <p className="text-sm text-center" style={{ color: "var(--danger)" }}>{error}</p>}
          <button className="btn-primary w-full text-lg py-4" onClick={completeSet} disabled={submitting}>
            {submitting ? "Logging…" : "COMPLETE SET"}
          </button>
        </div>
      )}
    </div>
  );
}

function CenterMessage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-sm mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      {description && <p className="text-text-2">{description}</p>}
    </div>
  );
}
