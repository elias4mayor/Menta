"use client";

import { useEffect, useRef, useState } from "react";
import { LiveSessionComplete } from "@/components/LiveSessionComplete";

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
  if (view.session.status === "COMPLETE") {
    return (
      <div className="live-root">
        <LiveSessionComplete
          teamId={teamId}
          sessionId={sessionId}
          title={view.session.title}
          variant="athlete"
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }
  if (view.session.status === "PAUSED") {
    return <CenterMessage title="Session paused" description="Your coach paused the room. Hang tight." />;
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
  const phaseKey = `${view.exercise.id}:${view.nextSetNumber}:${done ? "done" : resting ? "rest" : "work"}`;

  return (
    <div className="live-root">
      <div className="live-shell" style={{ maxWidth: 420, margin: "0 auto" }}>
        <div className="live-eyebrow">
          SET {view.nextSetNumber} {view.totalSets ? `OF ${view.totalSets}` : ""}
        </div>

        <div key={phaseKey} className="live-fade-enter" style={{ width: "100%" }}>
          {done ? (
            <>
              <h1 className="live-focal-title">Set complete</h1>
              <p className="live-sub">Waiting for your coach to advance the room.</p>
            </>
          ) : resting ? (
            <>
              <div className="live-eyebrow">REST</div>
              <div className="live-focal-metric">
                {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}
              </div>
              <p className="live-sub">Next: Set {view.nextSetNumber}</p>
            </>
          ) : (
            <>
              <h1 className="live-focal-title">{view.exercise.name}</h1>
              <div className="live-prescribed-value">{describePrescribed(view.prescribed)}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 32 }}>
                <label className="block">
                  <span className="live-eyebrow" style={{ marginBottom: 6, display: "block" }}>LOAD</span>
                  <input
                    className="field-input text-lg text-center"
                    value={loadInput}
                    onChange={(e) => setLoadInput(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label className="block">
                  <span className="live-eyebrow" style={{ marginBottom: 6, display: "block" }}>REPS</span>
                  <input
                    className="field-input text-lg text-center"
                    value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </div>
              <label className="block" style={{ marginTop: 12 }}>
                <span className="live-eyebrow" style={{ marginBottom: 6, display: "block" }}>RPE (OPTIONAL)</span>
                <input className="field-input text-center" value={rpeInput} onChange={(e) => setRpeInput(e.target.value)} inputMode="decimal" />
              </label>
              {error && (
                <p className="text-sm text-center" style={{ color: "var(--danger)", marginTop: 12 }}>
                  {error}
                </p>
              )}
              <button className="live-primary-btn" style={{ marginTop: 20 }} onClick={completeSet} disabled={submitting}>
                {submitting ? "Logging…" : "Complete set"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CenterMessage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="live-root">
      <div className="live-shell">
        <h1 className="live-focal-title" style={{ fontSize: "clamp(26px, 6vw, 38px)" }}>
          {title}
        </h1>
        {description && <p className="live-sub">{description}</p>}
      </div>
    </div>
  );
}
