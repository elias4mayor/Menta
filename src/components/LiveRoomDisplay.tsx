"use client";

import { useEffect, useState } from "react";
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
  title: string;
  status: string;
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
          showBackLink={false}
        />
      </div>
    );
  }

  return (
    <div className="live-root" style={{ padding: "56px 64px" }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="live-focal-title" style={{ fontSize: "clamp(40px, 6vw, 68px)" }}>{room.title}</h1>
        <span className="live-eyebrow" style={{ fontSize: 20, letterSpacing: "0.1em" }}>
          {room.status === "LIVE" ? "● LIVE" : room.status}
        </span>
      </div>
      {room.currentBlockTitle && <p className="live-eyebrow mb-10" style={{ fontSize: 22 }}>{room.currentBlockTitle.toUpperCase()}</p>}

      <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.min(room.groups.length, 3) || 1}, 1fr)` }}>
        {room.groups.map((group) => {
          const completeCount = group.members.filter((m) => m.status === "COMPLETE").length;
          return (
            <div key={group.id} className="live-card p-8">
              <div className="text-3xl font-semibold mb-1">{group.name}</div>
              {group.stationLabel && <div className="text-xl mb-4" style={{ color: "var(--text-2)" }}>{group.stationLabel}</div>}
              <div className="live-eyebrow mb-6" style={{ fontSize: 20 }}>{group.currentExerciseName ?? "—"}</div>
              <div className="text-xl mb-4" style={{ color: "var(--text-2)" }}>{completeCount}/{group.members.length} complete</div>
              <ul className="space-y-3">
                {group.members.map((m) => (
                  <li key={m.athleteId} className="flex items-center gap-3 text-2xl">
                    <span className="live-status-dot live-status-dot-lg" style={{ background: STATUS_COLOR[m.status] }} />
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
