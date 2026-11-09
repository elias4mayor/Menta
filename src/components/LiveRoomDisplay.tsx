"use client";

import { useEffect, useState } from "react";
import { LiveSessionComplete } from "@/components/LiveSessionComplete";

type MemberStatus = "NOT_STARTED" | "IN_SET" | "RESTING" | "COMPLETE" | "BEHIND";

type RoomGroup = {
  id: string;
  name: string;
  stationLabel: string | null;
  currentExerciseName: string | null;
  members: { athleteId: string; athleteName: string; status: MemberStatus; completedSets: number; restEndsAt?: string | null }[];
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
export function LiveRoomDisplay({
  teamId,
  sessionId,
  initialRoom,
  rackId,
}: {
  teamId: string;
  sessionId: string;
  initialRoom: RoomView;
  rackId?: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [now, setNow] = useState<number | null>(null);
  const groups = rackId ? room.groups.filter((group) => group.id === rackId) : room.groups;

  useEffect(() => {
    if (room.status !== "LIVE") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room.status]);

  useEffect(() => {
    const controller = new AbortController();
    async function poll() {
      try {
        const response = await fetch(`/api/teams/${teamId}/sessions/${sessionId}`, { signal: controller.signal });
        if (!response.ok) return;
        const { session } = await response.json();
        if (!controller.signal.aborted) setRoom(session);
      } catch {
        // Keep the last room state visible while the next poll retries.
      }
    }
    const interval = setInterval(poll, 4000);
    return () => {
      controller.abort();
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
    <div className="live-root" style={{ padding: "clamp(16px, 5vw, 64px)" }}>
      <p className="live-eyebrow">Forge Mode · {rackId ? "Rack display" : "Room display"}</p>
      <div className="flex items-center justify-between mb-2">
        <h1 className="live-focal-title" style={{ fontSize: "clamp(40px, 6vw, 68px)" }}>{room.title}</h1>
        <span className="live-eyebrow" style={{ fontSize: 20, letterSpacing: "0.1em" }}>
          {room.status === "LIVE" ? "● LIVE" : room.status}
        </span>
      </div>
      {room.currentBlockTitle && <p className="live-eyebrow mb-10" style={{ fontSize: 22 }}>{room.currentBlockTitle.toUpperCase()}</p>}

      {groups.length === 0 && <p>No stations assigned.</p>}
      <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3) || 1}, 1fr)` }}>
        {groups.map((group) => {
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
                    <span className="tabular-nums text-lg">
                      {room.status === "LIVE" && m.status === "RESTING" && m.restEndsAt && now !== null
                        ? `Rest · ${Math.max(0, Math.ceil((Date.parse(m.restEndsAt) - now) / 1000))}s`
                        : `${m.completedSets} sets`}
                    </span>
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
