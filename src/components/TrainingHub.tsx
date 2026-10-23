import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";

export type TeamSessionInfo = {
  teamId: string;
  teamName: string;
  sessionId: string | null;
  title: string | null;
  status: "LIVE" | "TODAY" | "NONE";
};

export type TrainingHubProps = {
  isCoach: boolean;
  workoutsThisWeek: number;
  totalWorkouts: number;
  latestStat: { statName: string; value: number; unit: string | null } | null;
  teamSession: TeamSessionInfo | null;
  primaryTeamId: string | null;
};

const TILE_STYLE: React.CSSProperties = {
  border: "1px solid transparent",
  backgroundImage: "linear-gradient(var(--surface), var(--surface)), var(--grad-signal)",
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
};

/**
 * The front door for Training — three clear entry points instead of
 * dropping straight into the full workout list. The list, program
 * builder, position groups, and live sessions are all existing,
 * already-built features; this is a landing layer in front of them,
 * not a parallel system.
 */
export function TrainingHub({
  isCoach,
  workoutsThisWeek,
  totalWorkouts,
  latestStat,
  teamSession,
  primaryTeamId,
}: TrainingHubProps) {
  const weightRoomHref = teamSession?.status === "LIVE" && teamSession.sessionId
    ? `/team/${teamSession.teamId}/sessions/${teamSession.sessionId}/me`
    : isCoach && primaryTeamId
      ? `/team/${primaryTeamId}/programs`
      : "/team";

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Training</div>
      <h1 className="text-3xl font-semibold mb-8">
        <GlowWaveText intensity="strong">What do you want to do?</GlowWaveText>
      </h1>

      <div className="grid gap-4 sm:grid-cols-1">
        <Link href="/train/library" className="card card-hover p-6 block" style={TILE_STYLE}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold">Build Workout</div>
            <span className="badge">{totalWorkouts === 0 ? "Get started" : `${workoutsThisWeek} this week`}</span>
          </div>
          <p className="text-text-2 text-sm">
            Create a workout by hand, generate one from your sport and position, and track sets,
            reps, weight, and completions over time.
          </p>
        </Link>

        <Link href={weightRoomHref} className="card card-hover p-6 block" style={TILE_STYLE}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold">Team Weight Room</div>
            {teamSession?.status === "LIVE" ? (
              <span className="badge badge-live">Live now</span>
            ) : teamSession?.status === "TODAY" ? (
              <span className="badge">Today</span>
            ) : isCoach ? (
              <span className="badge">Manage</span>
            ) : (
              <span className="badge">None scheduled</span>
            )}
          </div>
          <p className="text-text-2 text-sm">
            {teamSession?.title
              ? `${teamSession.status === "LIVE" ? "In progress" : "Scheduled today"}: ${teamSession.title} — ${teamSession.teamName}`
              : isCoach
                ? "Assign programs to your team or a position group, and monitor who's keeping up."
                : "Join your team's live session, or check what's scheduled."}
          </p>
        </Link>

        <Link href="/performance" className="card card-hover p-6 block" style={TILE_STYLE}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold">Log Measurements</div>
            {latestStat && (
              <span className="badge">
                {latestStat.statName}: {latestStat.value}
                {latestStat.unit ?? ""}
              </span>
            )}
          </div>
          <p className="text-text-2 text-sm">
            Track height, weight, 40-yard dash, vertical jump, bench, squat, and any other stat —
            and see your personal records over time.
          </p>
        </Link>
      </div>
    </div>
  );
}
