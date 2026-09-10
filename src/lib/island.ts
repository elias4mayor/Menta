import "server-only";
import { prisma } from "@/lib/prisma";
import { getMyDay } from "@/lib/my-day";
import { getAthleteSignals, type AthleteSignal } from "@/lib/athlete-signals";

/**
 * athlete-signals.ts messages are full sentences ("Goal "X" was due Y and
 * is only Z% complete.") — good reasoning text, bad headline. Pulls out
 * just the quoted goal/assignment name for the two signal kinds that name
 * one; TrainingBehindPace has no named item, so it gets a short label
 * instead. Falls back to the full message only if a future signal kind
 * doesn't match either shape, so this never throws away real information.
 */
function shortTitleForSignal(signal: AthleteSignal): string {
  const quoted = signal.message.match(/"([^"]+)"/);
  if (quoted) return quoted[1];
  if (signal.kind === "TrainingBehindPace") return "Catch up on training";
  return signal.message;
}

/**
 * Server-side aggregation for the MENTA Island (src/components/MENTAIsland.tsx)
 * — the same "real data only, honest fallbacks, never fabricate" discipline
 * as getMyDay()/getAthleteSignals() (src/lib/my-day.ts, athlete-signals.ts),
 * which this reuses rather than re-deriving. Deliberately excludes:
 *   - WellnessCheckIn/MindCheckIn (Recovery/Mindset check-in data) — the
 *     hard privacy rule in CLAUDE.md ("never joined into team rosters/
 *     broader surfaces") applies here exactly as it does everywhere else;
 *     the Island is a global, always-mounted surface, so this rule matters
 *     more here, not less.
 *   - Any "recruiting opportunity" concept — RecruitingSchool/Activity has
 *     no opportunity-matching feature built. Pulse reports a real tracked-
 *     school count instead of inventing "opportunities."
 *   - A composite "readiness %" — nothing in the schema computes one. The
 *     collapsed Island shows a real today-item count instead.
 * ATHLETE-only: coaches/trainers/parents/doctors don't have the per-athlete
 * pillars this aggregates (goals, training-day targets, a personal film
 * queue) — getIslandState() returns null for any other role, and the
 * component falls back to a plain capsule (no Pulse/Next Move) for them.
 */

export type IslandPulseRow = {
  key: "training" | "academics" | "film" | "recruiting";
  label: string;
  value: string;
  href: string;
};

export type IslandNextMove = {
  title: string;
  href: string;
  actionLabel: string;
  /** Real, human-readable reason — either an athlete-signals.ts message or
      a plain statement of the real due date/time. Never AI-generated,
      never invented — this is what backs the "Why?" interaction. */
  why: string;
};

export type IslandState = {
  todayCount: number;
  nextMove: IslandNextMove | null;
  pulse: IslandPulseRow[];
};

export async function getIslandState(userId: string): Promise<IslandState | null> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId },
    select: { trainingDaysPerWeek: true },
  });
  if (!profile) return null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [myDay, signals, completionsThisWeek, openAssignmentCount, openFilmCount, trackedSchoolCount] =
    await Promise.all([
      getMyDay(userId, now),
      getAthleteSignals(userId, now),
      prisma.workoutCompletion.count({ where: { userId, completedAt: { gte: weekAgo } } }),
      prisma.assignment.count({ where: { userId, status: { not: "COMPLETED" } } }),
      prisma.filmAssignmentTarget.count({ where: { userId, status: { not: "COMPLETED" } } }),
      prisma.recruitingSchool.count({ where: { userId, status: { not: "NOT_PURSUING" } } }),
    ]);

  // Next Move: a real athlete-signals.ts flag takes priority (it's already
  // the most "this needs attention" thing MENTA knows) — falls back to the
  // earliest real item on today's schedule, then to the earliest upcoming
  // one. Never invented when both are empty.
  let nextMove: IslandNextMove | null = null;
  if (signals.length > 0) {
    const signal = signals[0];
    const hrefByKind: Record<typeof signal.kind, string> = {
      GoalBehindSchedule: "/dashboard#goals",
      TrainingBehindPace: "/train",
      StaleFilmAssignment: "/assignments",
    };
    nextMove = {
      // athlete-signals.ts messages are full narrated sentences (built for
      // this exact "why" slot) — using one as the headline too made Next
      // Move's title an unreadable run-on that got cut off mid-word.
      // shortTitleForSignal() below pulls out just the real named
      // goal/assignment (or a short label for the one signal kind with no
      // quoted name), so the headline stays a title and the sentence
      // stays the reasoning.
      title: shortTitleForSignal(signal),
      href: hrefByKind[signal.kind],
      actionLabel: "Open",
      why: signal.message,
    };
  } else if (myDay.today.length > 0) {
    const item = myDay.today[0];
    nextMove = {
      title: item.title,
      href: item.href,
      actionLabel: "Open",
      why: `Due today at ${item.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
    };
  } else if (myDay.upcoming.length > 0) {
    const item = myDay.upcoming[0];
    nextMove = {
      title: item.title,
      href: item.href,
      actionLabel: "Open",
      why: `Next up: ${item.at.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`,
    };
  }

  const pulse: IslandPulseRow[] = [];

  if (myDay.todaySession) {
    pulse.push({
      key: "training",
      label: "Training",
      value: myDay.todaySession.status === "LIVE" ? "Live now" : "Scheduled today",
      href: `/team/${myDay.todaySession.teamId}/sessions/${myDay.todaySession.id}/me`,
    });
  } else if (profile.trainingDaysPerWeek) {
    pulse.push({
      key: "training",
      label: "Training",
      value: `${completionsThisWeek}/${profile.trainingDaysPerWeek} this week`,
      href: "/train",
    });
  }

  if (openAssignmentCount > 0) {
    pulse.push({
      key: "academics",
      label: "Academics",
      value: `${openAssignmentCount} open task${openAssignmentCount === 1 ? "" : "s"}`,
      href: "/school",
    });
  }

  if (openFilmCount > 0) {
    pulse.push({
      key: "film",
      label: "Film",
      value: `${openFilmCount} to review`,
      href: "/assignments",
    });
  }

  if (trackedSchoolCount > 0) {
    pulse.push({
      key: "recruiting",
      label: "Recruiting",
      value: `${trackedSchoolCount} school${trackedSchoolCount === 1 ? "" : "s"} tracked`,
      href: "/recruit",
    });
  }

  return {
    todayCount: myDay.today.length,
    nextMove,
    pulse,
  };
}
