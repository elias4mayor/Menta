"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  mutations?: { correlationId: string }[];
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
 * simultaneous items, updated from the Forge room stream.
 */
export function LiveRoomDisplay({
  teamId,
  sessionId,
  initialRoom,
  rackId,
  measurePerformance = false,
}: {
  teamId: string;
  sessionId: string;
  initialRoom: RoomView;
  rackId?: string;
  measurePerformance?: boolean;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [accessEnded, setAccessEnded] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const pendingMarks = useRef<string[]>([]);
  const frames = useRef(new Set<number>());
  const perfReady = measurePerformance && Array.isArray(room.mutations);

  useLayoutEffect(() => {
    if (!perfReady || accessEnded || document.visibilityState !== "visible") {
      pendingMarks.current = [];
      return;
    }
    const batch = pendingMarks.current.splice(0);
    if (batch.length === 0) return;
    for (const id of batch) performance.mark(`forge:${id}:commit`);

    // The second animation frame observes a frame opportunity after React
    // committed this room state. The browser does not expose pixel paint time.
    const activeFrames = frames.current;
    const first = requestAnimationFrame(() => {
      activeFrames.delete(first);
      const second = requestAnimationFrame(() => {
        activeFrames.delete(second);
        if (document.visibilityState !== "visible") return;
        for (const id of batch) {
          const prefix = `forge:${id}`;
          performance.mark(`${prefix}:frame`);
          performance.measure(`${prefix}:receive-to-commit`, `${prefix}:receive`, `${prefix}:commit`);
          performance.measure(`${prefix}:receive-to-frame`, `${prefix}:receive`, `${prefix}:frame`);
        }
      });
      activeFrames.add(second);
    });
    activeFrames.add(first);
  }, [accessEnded, perfReady, room]);

  useLayoutEffect(() => {
    const activeFrames = frames.current;
    return () => {
      for (const frame of activeFrames) cancelAnimationFrame(frame);
      activeFrames.clear();
    };
  }, []);

  const perfAttributes = perfReady
    ? { "data-forge-perf": "ready", "data-forge-transport": "sse" }
    : {};

  const groups = rackId ? room.groups.filter((group) => group.id === rackId) : room.groups;

  useEffect(() => {
    if (room.status !== "LIVE") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room.status]);

  useEffect(() => {
    const path = `/api/teams/${teamId}/sessions/${sessionId}`;
    const controller = new AbortController();
    const events = new EventSource(`${path}/stream`);
    let fallback: ReturnType<typeof setInterval> | undefined;
    let streaming = false;

    function endAccess() {
      events.close();
      clearInterval(fallback);
      controller.abort();
      setAccessEnded(true);
    }

    async function recover() {
      try {
        const response = await fetch(path, { signal: controller.signal });
        if (controller.signal.aborted || streaming) return;
        if ([401, 403, 404].includes(response.status)) {
          endAccess();
        } else if (response.ok) {
          const { session } = await response.json();
          if (!controller.signal.aborted && !streaming) setRoom(session);
        }
      } catch {
        // The stream reconnects while the fallback retries.
      }
    }

    events.addEventListener("forge.snapshot", (event: MessageEvent<string>) => {
      streaming = true;
      clearInterval(fallback);
      fallback = undefined;
      const receivedAt = performance.now();
      const snapshot: RoomView = JSON.parse(event.data);
      if (measurePerformance) {
        for (const { correlationId } of snapshot.mutations ?? []) {
          const name = `forge:${correlationId}:receive`;
          if (performance.getEntriesByName(name, "mark").length === 0) {
            performance.mark(name, { startTime: receivedAt });
            pendingMarks.current.push(correlationId);
          }
        }
      }
      setRoom(snapshot);
    });
    events.addEventListener("forge.access-ended", endAccess);
    events.onerror = () => {
      streaming = false;
      if (fallback === undefined) {
        void recover();
        fallback = setInterval(() => void recover(), 4000);
      }
    };

    return () => {
      events.close();
      clearInterval(fallback);
      controller.abort();
    };
  }, [teamId, sessionId, measurePerformance]);

  if (accessEnded) return <div className="live-root">This Forge session is no longer available.</div>;

  if (room.status === "COMPLETE") {
    return (
      <div className="live-root" {...perfAttributes}>
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
    <div className="live-root" {...perfAttributes} style={{ padding: "clamp(16px, 5vw, 64px)" }}>
      <p className="live-eyebrow">Forge · {rackId ? "Rack display" : "Room display"}</p>
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
