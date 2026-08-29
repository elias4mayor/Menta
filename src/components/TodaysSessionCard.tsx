import Link from "next/link";
import type { TodaySession } from "@/lib/my-day";

/**
 * The athlete-facing surface for MENTA LIVE — deliberately speaks only in
 * human terms (a session name, a time, how many teammates are training)
 * and never TrainingSession/TrainingGroup/TrainingProgram/ProgramExercise,
 * which are implementation concepts. Reuses the existing MENTA LIVE
 * athlete screen (/team/[teamId]/sessions/[id]/me) as the single
 * destination — this card is purely a "do you have one, and where do you
 * go" surface, not a second live-session UI.
 */
export function TodaysSessionCard({ session }: { session: TodaySession | null }) {
  if (!session) {
    return <p className="text-text-3 text-sm mb-6">No training session today.</p>;
  }

  const isLive = session.status === "LIVE";
  const href = `/team/${session.teamId}/sessions/${session.id}/me`;

  const timeLabel = isLive
    ? session.currentExerciseName ?? "In progress"
    : session.scheduledAt
      ? session.scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "Starting soon";

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="mono text-text-3">{isLive ? "Live now" : "Up next"}</div>
        <span className={`badge${isLive ? " badge-live" : ""}`}>{isLive ? "● Live" : "Scheduled"}</span>
      </div>
      <h3 className="text-xl font-semibold mb-1">{session.title}</h3>
      <p className="text-text-2 text-sm mb-4">
        {timeLabel}
        {isLive && ` · ${session.athleteCount} athlete${session.athleteCount === 1 ? "" : "s"} training`}
      </p>
      <Link href={href} className="btn-primary w-full justify-center">
        {isLive ? "Join live session →" : "View session →"}
      </Link>
    </div>
  );
}
