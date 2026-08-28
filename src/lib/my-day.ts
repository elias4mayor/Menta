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
): Promise<{ today: MyDayItem[]; upcoming: MyDayItem[] }> {
  const todayEnd = endOfDay(now);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [todaysEvents, upcomingEvents, openAssignments, openFilmTargets] = await Promise.all([
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

  return { today, upcoming };
}
