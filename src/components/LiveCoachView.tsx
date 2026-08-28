"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProgramDetail } from "@/components/ProgramBuilder";

type MemberStatus = "NOT_STARTED" | "IN_SET" | "RESTING" | "COMPLETE" | "BEHIND";

type RoomGroup = {
  id: string;
  name: string;
  stationLabel: string | null;
  currentExerciseName: string | null;
  members: { athleteId: string; athleteName: string; status: MemberStatus; completedSets: number }[];
};

type RoomView = {
  id: string;
  title: string;
  status: string;
  programTitle: string | null;
  currentBlockTitle: string | null;
  groups: RoomGroup[];
};

const STATUS_COLOR: Record<MemberStatus, string> = {
  NOT_STARTED: "var(--text-3)",
  IN_SET: "var(--text-1)",
  RESTING: "#d4a017",
  COMPLETE: "#1a9c5c",
  BEHIND: "var(--danger)",
};

const TRANSITIONS: Record<string, { label: string; target: string }[]> = {
  SCHEDULED: [{ label: "Start session", target: "LIVE" }, { label: "Cancel", target: "CANCELED" }],
  LIVE: [{ label: "Pause", target: "PAUSED" }, { label: "Complete session", target: "COMPLETE" }, { label: "Cancel", target: "CANCELED" }],
  PAUSED: [{ label: "Resume", target: "LIVE" }, { label: "Complete session", target: "COMPLETE" }, { label: "Cancel", target: "CANCELED" }],
  COMPLETE: [],
  CANCELED: [],
};

/** Flat, program-ordered exercise list — lets the client (not the server) compute "what's next" for the advance actions. */
function flatExercises(program: ProgramDetail | null) {
  if (!program) return [];
  return program.blocks.flatMap((b) => b.exercises.map((e) => ({ id: e.exerciseId, programExerciseId: e.id, name: e.exerciseName, blockTitle: b.title })));
}

export function LiveCoachView({
  teamId,
  sessionId,
  canManage,
  initialRoom,
  program,
}: {
  teamId: string;
  sessionId: string;
  canManage: boolean;
  initialRoom: RoomView;
  program: ProgramDetail | null;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [busy, setBusy] = useState(false);

  const sequence = useMemo(() => flatExercises(program), [program]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}`);
      if (cancelled || !res.ok) return;
      const data = await res.json();
      setRoom(data.session);
    }
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [teamId, sessionId]);

  async function refresh() {
    const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}`);
    if (res.ok) setRoom((await res.json()).session);
  }

  async function transition(target: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  function nextExerciseNameFor(currentExerciseName: string | null) {
    const index = sequence.findIndex((e) => e.name === currentExerciseName);
    return index >= 0 && index + 1 < sequence.length ? sequence[index + 1] : null;
  }

  async function advanceGroup(groupId: string, currentExerciseName: string | null) {
    const next = nextExerciseNameFor(currentExerciseName);
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}/groups/${groupId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId: next.programExerciseId }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function advanceWholeRoom() {
    const reference = room.groups[0]?.currentExerciseName ?? null;
    const next = nextExerciseNameFor(reference);
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId: next.programExerciseId }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  const attention = room.groups.flatMap((g) => g.members.filter((m) => m.status === "BEHIND").map((m) => ({ ...m, groupName: g.name })));

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="mono text-text-3">{room.programTitle ?? "MENTA LIVE"}</div>
          <h1 className="text-2xl font-semibold">{room.title}</h1>
        </div>
        <span className="badge">
          {room.status === "LIVE" ? "● LIVE" : room.status}
        </span>
      </div>
      {room.currentBlockTitle && <p className="mono text-text-3 text-sm mb-6">CURRENT BLOCK: {room.currentBlockTitle.toUpperCase()}</p>}

      {canManage && (
        <div className="flex flex-wrap gap-2 mb-6">
          {TRANSITIONS[room.status]?.map((t) => (
            <button key={t.target} className={t.target === "CANCELED" ? "btn-secondary text-xs" : "btn-primary text-xs"} onClick={() => transition(t.target)} disabled={busy}>
              {t.label}
            </button>
          ))}
          {room.status === "LIVE" && sequence.length > 0 && (
            <button className="btn-secondary text-xs" onClick={advanceWholeRoom} disabled={busy}>
              Advance whole room →
            </button>
          )}
        </div>
      )}

      {attention.length > 0 && (
        <div className="card p-4 mb-6" style={{ borderLeft: "3px solid var(--danger)" }}>
          <div className="mono text-xs mb-2" style={{ color: "var(--danger)" }}>ATTENTION</div>
          <ul className="space-y-1 text-sm">
            {attention.map((a) => (
              <li key={a.athleteId}>▲ {a.athleteName} ({a.groupName}) — behind pace</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {room.groups.map((group) => {
          const completeCount = group.members.filter((m) => m.status === "COMPLETE").length;
          const next = nextExerciseNameFor(group.currentExerciseName);
          return (
            <div key={group.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">{group.name}{group.stationLabel ? ` — ${group.stationLabel}` : ""}</div>
                {canManage && room.status === "LIVE" && next && (
                  <button className="text-xs text-text-2 hover:text-text-1" onClick={() => advanceGroup(group.id, group.currentExerciseName)} disabled={busy}>
                    Advance →
                  </button>
                )}
              </div>
              <div className="mono text-text-3 text-xs mb-3">{group.currentExerciseName ?? "No exercise"}</div>
              <p className="text-text-2 text-xs mb-2">{completeCount}/{group.members.length} complete</p>
              <ul className="space-y-1.5">
                {group.members.map((m) => (
                  <li key={m.athleteId} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[m.status] }} />
                    <span className="flex-1 truncate">{m.athleteName}</span>
                    <span className="mono text-text-3 text-xs">{m.completedSets} sets</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
