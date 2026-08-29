import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Normalized "My Day" item — the common shape the dashboard, the AI
 * context, and (eventually) any other consumer can all read without each
 * one having to understand CalendarEvent/Assignment/FilmAssignmentTarget
 * separately. Deliberately minimal: only what every current consumer
 * actually needs (title, when, where to go, what kind it is). Extend it
 * if a real consumer needs more — don't pre-add fields nothing reads yet.
 */
export type MyDayItem = {
  id: string;
  kind: "Event" | "Academic" | "Film";
  title: string;
  at: Date;
  href: string;
  /** Set only for Event items sourced from a team calendar — lets a consumer (the Daily Brief) say "your team has X" instead of treating every event as personal. */
  teamName?: string;
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * The one MENTA LIVE session (if any) most relevant to this athlete right
 * now — human-readable, never the raw TrainingProgram/TrainingBlock/
 * TrainingGroup/ProgramExercise shape underneath. A dedicated return slot
 * rather than one more MyDayItem: the dashboard card needs richer,
 * session-specific fields (status, room size, current exercise) that
 * don't fit the generic {kind,title,at,href} shape the rest of My Day
 * uses, and folding them in as optional fields would leak session-only
 * concepts into every other MyDayItem consumer for no benefit.
 */
export type TodaySession = {
  id: string;
  teamId: string;
  title: string;
  status: "LIVE" | "SCHEDULED";
  scheduledAt: Date | null;
  startedAt: Date | null;
  athleteCount: number;
  currentExerciseName: string | null;
};

/**
 * Strictly scoped to real TrainingGroupMember rows for this exact
 * athlete — never derived from a client-supplied id, never a query that
 * could return another athlete's or another team's session. "Today"
 * means: any LIVE session (it's happening right now, by definition
 * "today" regardless of when it was scheduled), or a SCHEDULED session
 * whose scheduledAt falls today, or a SCHEDULED session with no
 * scheduledAt at all that was created today (the common "coach just hit
 * Start a live session and hasn't gone LIVE yet" case). CANCELED/
 * COMPLETE are never included — this isn't a history view.
 *
 * If an athlete is (rarely) in more than one qualifying session, LIVE
 * always wins over SCHEDULED, and ties break on the earliest relevant
 * timestamp — a deterministic "what should I look at first" rule, not a
 * guess.
 */
async function getTodaySession(userId: string, now: Date): Promise<TodaySession | null> {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const memberships = await prisma.trainingGroupMember.findMany({
    where: {
      athleteId: userId,
      session: {
        OR: [
          { status: "LIVE" },
          { status: "SCHEDULED", scheduledAt: { gte: dayStart, lte: dayEnd } },
          { status: "SCHEDULED", scheduledAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
        ],
      },
    },
    include: {
      session: { select: { id: true, teamId: true, title: true, status: true, scheduledAt: true, startedAt: true, createdAt: true, _count: { select: { groupMemberships: true } } } },
      group: { select: { currentProgramExercise: { select: { exercise: { select: { name: true } } } } } },
    },
  });

  if (memberships.length === 0) return null;

  const sorted = [...memberships].sort((a, b) => {
    const aLive = a.session.status === "LIVE" ? 0 : 1;
    const bLive = b.session.status === "LIVE" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    const aTime = (a.session.startedAt ?? a.session.scheduledAt ?? a.session.createdAt).getTime();
    const bTime = (b.session.startedAt ?? b.session.scheduledAt ?? b.session.createdAt).getTime();
    return aTime - bTime;
  });

  const chosen = sorted[0];
  return {
    id: chosen.session.id,
    teamId: chosen.session.teamId,
    title: chosen.session.title,
    status: chosen.session.status as "LIVE" | "SCHEDULED",
    scheduledAt: chosen.session.scheduledAt,
    startedAt: chosen.session.startedAt,
    athleteCount: chosen.session._count.groupMemberships,
    currentExerciseName: chosen.group.currentProgramExercise?.exercise.name ?? null,
  };
}

/**
 * Every real thing on an athlete's plate today and in the near future,
 * across the three sources that actually carry due dates/times (calendar,
 * academic assignments, film review) — merged, deduplicated by
 * construction (each source contributes disjoint rows), and chronologically
 * ordered. Nothing here is fabricated: an item only appears if it's a real
 * row with a real date in range.
 *
 * Times are plain server-local clock time, same simplification
 * CalendarEvent's DateTime fields and care-server.ts's slot computation
 * already use — a real per-user timezone model is a separate, larger
 * change this doesn't make.
 */
export async function getMyDay(
  userId: string,
  now: Date = new Date()
): Promise<{ today: MyDayItem[]; upcoming: MyDayItem[]; todaySession: TodaySession | null }> {
  const todayEnd = endOfDay(now);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [todaysEvents, upcomingEvents, openAssignments, openFilmTargets, todaySession] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        startsAt: { gte: startOfDay(now), lte: todayEnd },
        OR: [{ createdById: userId }, { team: { memberships: { some: { userId } } } }],
      },
      include: { team: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startsAt: { gt: todayEnd, lte: weekAhead },
        OR: [{ createdById: userId }, { team: { memberships: { some: { userId } } } }],
      },
      include: { team: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    prisma.assignment.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.filmAssignmentTarget.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      include: { assignment: { select: { title: true, dueAt: true } } },
      orderBy: { assignment: { dueAt: "asc" } },
      take: 10,
    }),
    getTodaySession(userId, now),
  ]);

  const dueTodayAssignments = openAssignments.filter((a) => a.dueDate && a.dueDate <= todayEnd);
  const dueTodayFilm = openFilmTargets.filter((t) => t.assignment.dueAt && t.assignment.dueAt <= todayEnd);

  const today: MyDayItem[] = [
    ...todaysEvents.map((e) => ({ id: e.id, kind: "Event" as const, title: e.title, at: e.startsAt, href: "/calendar", teamName: e.team?.name })),
    ...dueTodayAssignments.map((a) => ({ id: a.id, kind: "Academic" as const, title: a.title, at: a.dueDate as Date, href: "/school" })),
    ...dueTodayFilm.map((t) => ({ id: t.id, kind: "Film" as const, title: t.assignment.title, at: t.assignment.dueAt as Date, href: "/assignments" })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const upcoming: MyDayItem[] = [
    ...upcomingEvents.map((e) => ({ id: e.id, kind: "Event" as const, title: e.title, at: e.startsAt, href: "/calendar", teamName: e.team?.name })),
    ...openAssignments
      .filter((a) => a.dueDate && a.dueDate > todayEnd)
      .map((a) => ({ id: a.id, kind: "Academic" as const, title: a.title, at: a.dueDate as Date, href: "/school" })),
    ...openFilmTargets
      .filter((t) => t.assignment.dueAt && t.assignment.dueAt > todayEnd)
      .map((t) => ({ id: t.id, kind: "Film" as const, title: t.assignment.title, at: t.assignment.dueAt as Date, href: "/assignments" })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 6);

  return { today, upcoming, todaySession };
}
