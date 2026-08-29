import "server-only";
import { prisma } from "@/lib/prisma";
import { getMyDay, type MyDayItem, type TodaySession } from "@/lib/my-day";
import { getAthleteSignals, type AthleteSignal } from "@/lib/athlete-signals";
import { visibleFilmWhere } from "@/lib/film-visibility";
import { isTeamCoachOrAdmin, hasTeamPermission } from "@/lib/permissions";
import type { GoalItem } from "@/components/GoalsPanel";

/**
 * The Unified Athlete Profile's single aggregation layer (Phase 8) — a
 * read-only VIEW composed entirely from existing models. No new schema,
 * no new API route: a server component calls getSelfAthleteProfile or
 * getCoachAthleteProfile directly, exactly like getMyDay()/
 * getAthleteSignals() are already called from dashboard/page.tsx.
 *
 * Authorization lives HERE, not in the calling page, so an unauthorized
 * cross-user/cross-team read is structurally impossible regardless of
 * what a future caller does — getCoachAthleteProfile returns null (never
 * partial data) unless both checks below pass.
 */

export type AthleteProfileIdentity = {
  userId: string;
  name: string;
  sport: string | null;
  position: string | null;
  schoolName: string | null;
  graduationYear: number | null;
  teams: { id: string; name: string; teamRole: string }[];
};

/** Matches CoachNotes.tsx's expected `Note` shape exactly, so the existing component can be reused unmodified. */
export type CoachNoteItem = {
  id: string;
  coachId: string;
  coachName: string;
  body: string;
  filmId: string | null;
  filmTitle: string | null;
  createdAt: string;
  isMine: boolean;
};

export type AthleteProfileData = {
  identity: AthleteProfileIdentity;
  today: { today: MyDayItem[]; upcoming: MyDayItem[]; todaySession: TodaySession | null };
  signals: AthleteSignal[];
  performance: { id: string; statName: string; value: number; unit: string | null; recordedAt: Date }[];
  training: {
    recentSets: { id: string; exerciseName: string; reps: number | null; weight: number | null; weightUnit: string | null; loggedAt: Date }[];
    currentPrescriptions: { id: string; exerciseName: string; programTitle: string; prescribedLoad: number | null; prescribedLoadUnit: string | null; prescribedReps: string | null; prescribedSets: number | null }[];
  };
  film: { id: string; title: string; category: string; createdAt: Date; clipCount: number }[];
  filmAssignments: { id: string; title: string; dueAt: Date | null; status: string }[];
  highlights: { id: string; title: string; createdAt: Date; visibleClipCount: number }[];
  academics: { gpa: number | null; openAssignmentCount: number; nextDueTitle: string | null; nextDueDate: Date | null };
  recruiting: { schoolCount: number; topSchools: { id: string; name: string; status: string }[]; recentActivityCount: number };
  goals: GoalItem[];
  /** null = not fetched at all (unauthorized or self-view) — never an empty array standing in for "hidden." */
  coachNotes: CoachNoteItem[] | null;
};

async function getIdentity(athleteId: string): Promise<AthleteProfileIdentity> {
  const [user, profile, primaryContext, memberships] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: athleteId }, select: { name: true } }),
    prisma.athleteProfile.findUnique({ where: { userId: athleteId }, select: { schoolName: true, graduationYear: true } }),
    prisma.athleteSportContext.findFirst({
      where: { userId: athleteId, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { sport: true, position: true },
    }),
    prisma.teamMembership.findMany({
      where: { userId: athleteId },
      select: { teamRole: true, team: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    userId: athleteId,
    name: user.name,
    sport: primaryContext?.sport ?? null,
    position: primaryContext?.position ?? null,
    schoolName: profile?.schoolName ?? null,
    graduationYear: profile?.graduationYear ?? null,
    teams: memberships.map((m) => ({ id: m.team.id, name: m.team.name, teamRole: m.teamRole })),
  };
}

async function getPerformanceSection(athleteId: string) {
  const entries = await prisma.performanceEntry.findMany({
    where: { userId: athleteId },
    orderBy: { recordedAt: "desc" },
    take: 6,
  });
  return entries.map((e) => ({ id: e.id, statName: e.statName, value: e.value, unit: e.unit, recordedAt: e.recordedAt }));
}

/**
 * TrainingSet and AthletePrescription both carry a real path to teamId
 * (TrainingSet.teamId directly; AthletePrescription via
 * programExercise.block.program.teamId) — scoping by team for the coach
 * view is a real, correctly-scoped filter, not an invented one. Self-view
 * passes teamId undefined and sees training across every team.
 */
async function getTrainingSection(athleteId: string, teamId: string | undefined) {
  const [recentSets, currentPrescriptions] = await Promise.all([
    prisma.trainingSet.findMany({
      where: { athleteId, ...(teamId ? { teamId } : {}) },
      orderBy: { loggedAt: "desc" },
      take: 8,
      include: { exercise: { select: { name: true } } },
    }),
    prisma.athletePrescription.findMany({
      where: {
        athleteId,
        ...(teamId ? { programExercise: { block: { program: { teamId } } } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        programExercise: {
          include: {
            exercise: { select: { name: true } },
            block: { include: { program: { select: { title: true } } } },
          },
        },
      },
    }),
  ]);

  return {
    recentSets: recentSets.map((s) => ({
      id: s.id,
      exerciseName: s.exercise.name,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.weightUnit,
      loggedAt: s.loggedAt,
    })),
    currentPrescriptions: currentPrescriptions.map((p) => ({
      id: p.id,
      exerciseName: p.programExercise.exercise.name,
      programTitle: p.programExercise.block.program.title,
      prescribedLoad: p.prescribedLoad,
      prescribedLoadUnit: p.prescribedLoadUnit,
      prescribedReps: p.prescribedReps,
      prescribedSets: p.prescribedSets,
    })),
  };
}

/**
 * Never `where: { uploadedById: athleteId }` alone — that would let a
 * coach see film the athlete uploaded that the coach isn't otherwise
 * authorized to see under the existing visibility-tier system. Combining
 * with visibleFilmWhere(viewerId) reuses that system exactly rather than
 * re-deriving it; for self-view (viewerId === athleteId) this is
 * equivalent to the existing /film page's own behavior, since
 * visibleFilmWhere already includes { uploadedById: userId } unconditionally.
 */
async function getFilmSection(athleteId: string, viewerId: string) {
  const viewerWhere = await visibleFilmWhere(viewerId);
  const films = await prisma.film.findMany({
    where: { AND: [{ uploadedById: athleteId }, viewerWhere] },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, title: true, category: true, createdAt: true, _count: { select: { clips: true } } },
  });
  return films.map((f) => ({ id: f.id, title: f.title, category: f.category, createdAt: f.createdAt, clipCount: f._count.clips }));
}

/** Scoped to the current team's assignments for coach-view — an athlete on multiple teams shouldn't surface another team's film assignments to this coach. */
async function getFilmAssignmentsSection(athleteId: string, teamId: string | undefined) {
  const targets = await prisma.filmAssignmentTarget.findMany({
    where: { userId: athleteId, status: { not: "COMPLETED" }, ...(teamId ? { assignment: { teamId } } : {}) },
    include: { assignment: { select: { title: true, dueAt: true } } },
    orderBy: { assignment: { dueAt: "asc" } },
    take: 5,
  });
  return targets.map((t) => ({ id: t.id, title: t.assignment.title, dueAt: t.assignment.dueAt, status: t.status }));
}

/**
 * Highlights have no visibility-tier system of their own (unlike Film) —
 * for coach-view, each highlight's clip count is reduced to only the
 * clips whose underlying film the coach is independently authorized to
 * see, via the same visibleFilmWhere() check as the Film section. Never
 * exposes which specific clips were excluded, just an honest count.
 */
async function getHighlightsSection(athleteId: string, viewerId: string, isSelf: boolean) {
  const highlights = await prisma.highlight.findMany({
    where: { userId: athleteId },
    include: { items: { include: { clip: { select: { filmId: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (isSelf) {
    return highlights.map((h) => ({ id: h.id, title: h.title, createdAt: h.createdAt, visibleClipCount: h.items.length }));
  }

  const filmIds = Array.from(new Set(highlights.flatMap((h) => h.items.map((i) => i.clip.filmId))));
  if (filmIds.length === 0) {
    return highlights.map((h) => ({ id: h.id, title: h.title, createdAt: h.createdAt, visibleClipCount: 0 }));
  }
  const viewerWhere = await visibleFilmWhere(viewerId);
  const visibleFilmRows = await prisma.film.findMany({ where: { AND: [{ id: { in: filmIds } }, viewerWhere] }, select: { id: true } });
  const visibleFilmIds = new Set(visibleFilmRows.map((f) => f.id));

  return highlights.map((h) => ({
    id: h.id,
    title: h.title,
    createdAt: h.createdAt,
    visibleClipCount: h.items.filter((i) => visibleFilmIds.has(i.clip.filmId)).length,
  }));
}

/**
 * No team dimension exists on Assignment/AthleteProfile.gpa in the
 * schema, and none of Academics/Recruiting/Goals/Performance have a
 * finer-grained authorization system the way Film does — isTeamCoachOrAdmin
 * (checked by the caller before this function ever runs) is the only gate
 * that applies to these sections, matching the locked product decision
 * that Coach Notes is the sole additional gate beyond it.
 */
async function getAcademicsSection(athleteId: string) {
  const [profile, openAssignments] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: athleteId }, select: { gpa: true } }),
    prisma.assignment.findMany({
      where: { userId: athleteId, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);
  const next = openAssignments[0];
  return {
    gpa: profile?.gpa ?? null,
    openAssignmentCount: openAssignments.length,
    nextDueTitle: next?.title ?? null,
    nextDueDate: next?.dueDate ?? null,
  };
}

async function getRecruitingSection(athleteId: string) {
  const [schools, recentActivityCount] = await Promise.all([
    prisma.recruitingSchool.findMany({
      where: { userId: athleteId },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 4,
      select: { id: true, name: true, status: true },
    }),
    prisma.recruitingActivity.count({ where: { userId: athleteId } }),
  ]);
  return { schoolCount: schools.length, topSchools: schools, recentActivityCount };
}

async function getGoalsSection(athleteId: string): Promise<GoalItem[]> {
  const goals = await prisma.goal.findMany({
    where: { userId: athleteId, status: "ACTIVE" },
    orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
    take: 6,
  });
  return goals.map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    actionPlan: g.actionPlan,
    progress: g.progress,
    status: g.status,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
  }));
}

/** Only ever called when the caller has already confirmed MANAGE_COACH_NOTES for this exact team. */
async function getCoachNotesSection(athleteId: string, teamId: string, viewerId: string): Promise<CoachNoteItem[]> {
  const notes = await prisma.coachNote.findMany({
    where: { teamId, athleteId },
    include: { film: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const coachIds = Array.from(new Set(notes.map((n) => n.coachId)));
  const coaches = await prisma.user.findMany({ where: { id: { in: coachIds } }, select: { id: true, name: true } });
  const nameById = new Map(coaches.map((c) => [c.id, c.name]));
  return notes.map((n) => ({
    id: n.id,
    coachId: n.coachId,
    coachName: nameById.get(n.coachId) ?? "Unknown",
    body: n.body,
    filmId: n.filmId,
    filmTitle: n.film?.title ?? null,
    createdAt: n.createdAt.toISOString(),
    isMine: n.coachId === viewerId,
  }));
}

async function buildProfile(
  athleteId: string,
  opts: { viewerId: string; teamId?: string; includeCoachNotes: boolean }
): Promise<AthleteProfileData> {
  const now = new Date();
  const isSelf = opts.viewerId === athleteId;

  const [identity, myDay, signals, performance, training, film, filmAssignments, highlights, academics, recruiting, goals, coachNotes] =
    await Promise.all([
      getIdentity(athleteId),
      getMyDay(athleteId, now),
      getAthleteSignals(athleteId, now),
      getPerformanceSection(athleteId),
      getTrainingSection(athleteId, opts.teamId),
      getFilmSection(athleteId, opts.viewerId),
      getFilmAssignmentsSection(athleteId, opts.teamId),
      getHighlightsSection(athleteId, opts.viewerId, isSelf),
      getAcademicsSection(athleteId),
      getRecruitingSection(athleteId),
      getGoalsSection(athleteId),
      opts.includeCoachNotes && opts.teamId ? getCoachNotesSection(athleteId, opts.teamId, opts.viewerId) : Promise.resolve(null),
    ]);

  // getMyDay()/getTodaySession() are athlete-scoped, not team-scoped — an
  // athlete on multiple teams could otherwise leak another team's calendar
  // event or live-session status to a coach who only belongs to one of
  // them. Cross-team isolation is a hard requirement for this profile, so
  // coach-view (teamId present) filters both down to the current team;
  // self-view is untouched (identical to the existing dashboard behavior).
  const today =
    opts.teamId && !isSelf
      ? {
          today: myDay.today.filter((i) => !i.teamName || identity.teams.some((t) => t.id === opts.teamId && t.name === i.teamName)),
          upcoming: myDay.upcoming.filter((i) => !i.teamName || identity.teams.some((t) => t.id === opts.teamId && t.name === i.teamName)),
          todaySession: myDay.todaySession && myDay.todaySession.teamId === opts.teamId ? myDay.todaySession : null,
        }
      : myDay;

  return { identity, today, signals, performance, training, film, filmAssignments, highlights, academics, recruiting, goals, coachNotes };
}

export async function getSelfAthleteProfile(userId: string): Promise<AthleteProfileData> {
  return buildProfile(userId, { viewerId: userId, includeCoachNotes: false });
}

/**
 * Returns null (never partial data) unless BOTH: the coach is a
 * COACH/ADMIN on this exact team, AND the athlete is currently a member
 * of this exact team. This is the two-part check the existing CoachNote
 * POST route already uses — the one existing GET page for CoachNotes
 * skips the second half, which is a real, narrow leak (a user's name
 * only) documented in the Phase 8 audit; this function deliberately does
 * not repeat that gap.
 */
export async function getCoachAthleteProfile(coachId: string, teamId: string, athleteId: string): Promise<AthleteProfileData | null> {
  const [isCoach, athleteMembership] = await Promise.all([
    isTeamCoachOrAdmin(coachId, teamId),
    prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: athleteId, teamId } } }),
  ]);
  if (!isCoach || !athleteMembership) return null;

  const includeCoachNotes = await hasTeamPermission(coachId, teamId, "MANAGE_COACH_NOTES");
  return buildProfile(athleteId, { viewerId: coachId, teamId, includeCoachNotes });
}
