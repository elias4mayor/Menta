import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";
import { NavTile } from "@/components/NavTile";
import type { getSessionRoomView } from "@/lib/live-sessions";

type RoomView = Awaited<ReturnType<typeof getSessionRoomView>>;

type FeaturedSession = {
  id: string;
  title: string;
  status: "LIVE" | "SCHEDULED";
  scheduledAt: Date | null;
  startedAt: Date | null;
  athleteCount: number;
};

type ProgramSummary = {
  id: string;
  title: string;
  status: string;
  blockCount: number;
  positionGroupName: string | null;
};

/**
 * The coach's "what do I need to do today" surface for one team —
 * deliberately not a rebuild of the athlete-facing /train, and not a
 * replacement for the Team overview/administration hub. Every read here
 * reuses an existing function (getTeamTodaySessions, getSessionRoomView,
 * listTeamPrograms) — nothing new was computed just for this page.
 */
export function CoachCommandCenter({
  teamId,
  teamName,
  canRunLiveSession,
  canManagePrograms,
  featuredSession,
  otherSessionsToday,
  room,
  programs,
  athleteCount,
}: {
  teamId: string;
  teamName: string;
  canRunLiveSession: boolean;
  canManagePrograms: boolean;
  featuredSession: FeaturedSession | null;
  otherSessionsToday: number;
  room: RoomView;
  programs: ProgramSummary[];
  athleteCount: number;
}) {
  const isLive = featuredSession?.status === "LIVE";

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{teamName}</div>
      <h1 className="text-3xl font-semibold mb-8">
        <GlowWaveText intensity="strong">Training command center</GlowWaveText>
      </h1>

      {/* TODAY — the one thing this page exists to answer first. */}
      <div className="card p-6 mb-8">
        {featuredSession ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="mono text-text-3">{isLive ? "Live now" : "Today"}</div>
              <span className={`badge${isLive ? " badge-live" : ""}`}>{isLive ? "● Live" : "Scheduled"}</span>
            </div>
            <h2 className="text-2xl font-semibold mb-1">{featuredSession.title}</h2>
            <p className="text-text-2 text-sm mb-1">
              {isLive
                ? `${featuredSession.athleteCount} athlete${featuredSession.athleteCount === 1 ? "" : "s"} training`
                : featuredSession.scheduledAt
                  ? featuredSession.scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "Starting soon"}
            </p>
            {room && (
              <p className="text-text-3 text-xs mb-4">
                {roomSummary(room)}
              </p>
            )}
            {otherSessionsToday > 0 && (
              <p className="text-text-3 text-xs mb-4">
                +{otherSessionsToday} more session{otherSessionsToday === 1 ? "" : "s"} today
              </p>
            )}
            <Link href={`/team/${teamId}/sessions/${featuredSession.id}`} className="btn-primary w-full justify-center">
              {isLive ? "Enter live session →" : "Open session →"}
            </Link>
          </>
        ) : (
          <>
            <div className="mono text-text-3 mb-2">Today</div>
            <h2 className="text-xl font-semibold mb-4">No training session today</h2>
            {canRunLiveSession && (
              <Link href={`/team/${teamId}/programs`} className="btn-primary w-full justify-center">
                Start a live session →
              </Link>
            )}
          </>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div className="mb-8">
        <div className="mono text-text-3 mb-2">Quick actions</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <NavTile href={`/team/${teamId}/programs`} icon="spark" label="Start live session" description="Pick a program to run" />
          <NavTile href={`/team/${teamId}/programs`} icon="train" label="Training programs" description="Build & manage programs" />
          <NavTile href={`/team/${teamId}/programs`} icon="team" label="Athlete prescriptions" description="Individualize numbers" />
          <NavTile href="/train/exercises" icon="film" label="Exercise library" description="Browse & add exercises" />
        </div>
      </div>

      {/* RECENT / ACTIVE PROGRAMS — a handful, not a database view. */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="mono text-text-3">Programs</div>
          <Link href={`/team/${teamId}/programs`} className="text-xs text-text-2 hover:text-text-1">
            All programs →
          </Link>
        </div>
        {programs.length === 0 ? (
          <p className="text-text-3 text-sm">
            No programs yet.
            {canManagePrograms && (
              <>
                {" "}
                <Link href={`/team/${teamId}/programs`} className="text-text-2 hover:text-text-1 underline">
                  Create one →
                </Link>
              </>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {programs.map((p) => (
              <NavTile
                key={p.id}
                href={`/team/${teamId}/programs/${p.id}`}
                icon="train"
                label={p.title}
                description={`${p.blockCount} block${p.blockCount === 1 ? "" : "s"}${p.positionGroupName ? ` · ${p.positionGroupName}` : ""}`}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S CONTEXT — a glance, not a roster page. */}
      <div className="card p-5">
        <div className="mono text-text-3 mb-2">Roster</div>
        <p className="text-text-2 text-sm">
          {athleteCount} athlete{athleteCount === 1 ? "" : "s"} on this team
        </p>
      </div>
    </div>
  );
}

function roomSummary(room: NonNullable<RoomView>): string {
  const members = room.groups.flatMap((g) => g.members);
  const complete = members.filter((m) => m.status === "COMPLETE").length;
  const behind = members.filter((m) => m.status === "BEHIND").length;
  const parts = [`${complete}/${members.length} complete`];
  if (behind > 0) parts.push(`${behind} need attention`);
  return parts.join(" · ");
}
