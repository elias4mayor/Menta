"use client";

import { useEffect, useState } from "react";

type MemberStatus = "NOT_STARTED" | "IN_SET" | "RESTING" | "COMPLETE" | "BEHIND";

type RoomGroup = {
  id: string;
  name: string;
  stationLabel: string | null;
  currentExerciseName: string | null;
  members: { athleteId: string; athleteName: string; status: MemberStatus; completedSets: number }[];
};

type RoomView = {
  title: string;
  status: string;
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

/**
 * Read-only, no controls at all — nothing on a wall-mounted TV needs to
 * be clickable. Largest type of any MENTA LIVE surface, fewest
 * simultaneous items, same 4s poll as the coach/athlete views.
 */
export function LiveRoomDisplay({ teamId, sessionId, initialRoom }: { teamId: string; sessionId: string; initialRoom: RoomView }) {
  const [room, setRoom] = useState(initialRoom);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/teams/${teamId}/sessions/${sessionId}`);
      if (cancelled || !res.ok) return;
      setRoom((await res.json()).session);
    }
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [teamId, sessionId]);

  return (
    <div className="min-h-screen px-10 py-8">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-5xl font-semibold">{room.title}</h1>
        <span className="text-2xl mono">{room.status === "LIVE" ? "● LIVE" : room.status}</span>
      </div>
      {room.currentBlockTitle && <p className="mono text-3xl text-text-3 mb-10">{room.currentBlockTitle.toUpperCase()}</p>}

      <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.min(room.groups.length, 3) || 1}, 1fr)` }}>
        {room.groups.map((group) => {
          const completeCount = group.members.filter((m) => m.status === "COMPLETE").length;
          return (
            <div key={group.id} className="card p-8">
              <div className="text-3xl font-semibold mb-1">{group.name}</div>
              {group.stationLabel && <div className="text-xl text-text-2 mb-4">{group.stationLabel}</div>}
              <div className="text-2xl mono text-text-3 mb-6">{group.currentExerciseName ?? "—"}</div>
              <div className="text-xl mb-4">{completeCount}/{group.members.length} complete</div>
              <ul className="space-y-2">
                {group.members.map((m) => (
                  <li key={m.athleteId} className="flex items-center gap-3 text-2xl">
                    <span className="inline-block w-4 h-4 rounded-full shrink-0" style={{ background: STATUS_COLOR[m.status] }} />
                    <span className="flex-1 truncate">{m.athleteName}</span>
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
