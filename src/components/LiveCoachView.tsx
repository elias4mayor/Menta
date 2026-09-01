"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProgramDetail } from "@/components/ProgramBuilder";
import { LiveSessionComplete } from "@/components/LiveSessionComplete";

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
  RESTING: "var(--warning)",
  COMPLETE: "var(--success)",
  BEHIND: "var(--danger)",
};

/** The one lifecycle action promoted to the primary slot per status — LIVE has none of its own since "advance the room" takes that slot whenever there's a next exercise; when there isn't (last exercise), the caller promotes "Complete session" instead. */
const PRIMARY_TRANSITION: Record<string, { label: string; target: string } | null> = {
  SCHEDULED: { label: "Start session", target: "LIVE" },
  LIVE: null,
  PAUSED: { label: "Resume", target: "LIVE" },
  COMPLETE: null,
  CANCELED: null,
};

const ALL_SECONDARY: Record<string, { label: string; target: string }[]> = {
  SCHEDULED: [{ label: "Cancel", target: "CANCELED" }],
  LIVE: [{ label: "Pause", target: "PAUSED" }, { label: "Complete session", target: "COMPLETE" }, { label: "Cancel", target: "CANCELED" }],
  PAUSED: [{ label: "Complete session", target: "COMPLETE" }, { label: "Cancel", target: "CANCELED" }],
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

  const roomReference = room.groups[0]?.currentExerciseName ?? null;
  const roomNext = nextExerciseNameFor(roomReference);

  async function advanceWholeRoom() {
    if (!roomNext) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programExerciseId: roomNext.programExerciseId }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (room.status === "COMPLETE") {
    return (
      <div className="live-root">
        <LiveSessionComplete
          teamId={teamId}
          sessionId={sessionId}
          title={room.title}
          variant="room"
          backHref={`/team/${teamId}/train`}
          backLabel="Back to Command Center"
        />
      </div>
    );
  }

  const attention = room.groups.flatMap((g) => g.members.filter((m) => m.status === "BEHIND").map((m) => ({ ...m, groupName: g.name })));
  const isLastExercise = room.status === "LIVE" && !roomNext;
  const primary = isLastExercise ? { label: "Complete session", target: "COMPLETE" } : PRIMARY_TRANSITION[room.status];
  const secondary = canManage
    ? (ALL_SECONDARY[room.status] ?? []).filter((t) => t.target !== primary?.target)
    : [];

  return (
    <div className="live-root" style={{ padding: "40px 24px" }}>
      <div className="dash-in dash-in-1" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="live-eyebrow">{room.programTitle ?? "MENTA LIVE"}</div>
            <h1 className="live-focal-title" style={{ fontSize: "clamp(24px, 4vw, 34px)" }}>{room.title}</h1>
          </div>
          <span className="badge">{room.status === "LIVE" ? "● LIVE" : room.status}</span>
        </div>
        {room.currentBlockTitle && <p className="live-eyebrow mb-8">CURRENT BLOCK: {room.currentBlockTitle.toUpperCase()}</p>}

        {canManage && (
          <div className="mb-8" key={`${room.status}:${roomReference ?? ""}`}>
            {room.status === "LIVE" && roomNext ? (
              <button className="live-primary-btn" onClick={advanceWholeRoom} disabled={busy} style={{ width: "auto", minWidth: 320 }}>
                Advance whole room → {roomNext.name}
              </button>
            ) : primary ? (
              <button className="live-primary-btn" onClick={() => transition(primary.target)} disabled={busy} style={{ width: "auto", minWidth: 240 }}>
                {primary.label}
              </button>
            ) : null}
            {secondary.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {secondary.map((t) => (
                  <button key={t.target} className="live-ghost-btn" onClick={() => transition(t.target)} disabled={busy}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {attention.length > 0 && (
          <div className="live-attention p-4 mb-6">
            <div className="live-eyebrow mb-2" style={{ color: "var(--danger)" }}>ATTENTION</div>
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
              <div key={group.id} className="live-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">{group.name}{group.stationLabel ? ` — ${group.stationLabel}` : ""}</div>
                  {canManage && room.status === "LIVE" && next && (
                    <button className="live-ghost-btn" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => advanceGroup(group.id, group.currentExerciseName)} disabled={busy}>
                      Advance →
                    </button>
                  )}
                </div>
                <div className="live-eyebrow mb-3">{group.currentExerciseName ?? "No exercise"}</div>
                <p className="live-sub" style={{ marginTop: 0, marginBottom: 8, fontSize: 13 }}>{completeCount}/{group.members.length} complete</p>
                <ul className="space-y-1.5">
                  {group.members.map((m) => (
                    <li key={m.athleteId} className="flex items-center gap-2 text-sm">
                      <span className="live-status-dot" style={{ background: STATUS_COLOR[m.status] }} />
                      <span className="flex-1 truncate">{m.athleteName}</span>
                      <span className="live-eyebrow" style={{ marginBottom: 0 }}>{m.completedSets} sets</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
