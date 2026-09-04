import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ExerciseFilters = {
  q?: string;
  category?: string;
  sport?: string;
  position?: string;
  equipment?: string;
};

/**
 * Team ids whose custom exercises this user may see — every team they
 * belong to, in any role, derived entirely server-side from their real
 * memberships. Never takes a client-supplied teamId as input, so there
 * is no way to widen this by passing a different id in a request.
 */
async function visibleTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMembership.findMany({ where: { userId }, select: { teamId: true } });
  return memberships.map((m) => m.teamId);
}

/**
 * The single source of truth for "which Exercise rows can this user see" —
 * every MENTA-curated global entry (teamId: null) plus their own teams'
 * custom entries, nothing else. Used by both the list API and the library
 * page's server-rendered initial data, and by the single-exercise lookup
 * below, so all three can never drift — same pattern as
 * src/lib/film-visibility.ts's visibleFilmWhere().
 */
export async function visibleExerciseWhere(userId: string): Promise<Prisma.ExerciseWhereInput> {
  const teamIds = await visibleTeamIds(userId);
  return { OR: [{ teamId: null }, { teamId: { in: teamIds } }] };
}

export async function listVisibleExercises(userId: string, filters: ExerciseFilters = {}) {
  const visible = await visibleExerciseWhere(userId);
  const and: Prisma.ExerciseWhereInput[] = [visible];

  // mode: "insensitive" (Postgres-only Prisma feature) matches SQLite's
  // default case-insensitive `contains` behavior for ASCII, which this
  // free-text search relied on implicitly before the Postgres migration.
  if (filters.q) and.push({ name: { contains: filters.q, mode: "insensitive" } });
  if (filters.category) and.push({ category: filters.category });
  if (filters.sport) and.push({ sport: filters.sport });
  // positions/equipment are JSON-stringified arrays (see Exercise's own
  // doc comment in schema.prisma) — a real join table isn't justified at
  // this library's size yet, so filtering is a substring match against
  // the JSON-quoted value, the same simple-until-proven-insufficient
  // tradeoff Workout.exercises already makes for its own JSON blob.
  if (filters.position) and.push({ positions: { contains: `"${filters.position}"` } });
  if (filters.equipment) and.push({ equipment: { contains: `"${filters.equipment}"` } });

  return prisma.exercise.findMany({
    where: { AND: and },
    include: { team: { select: { id: true, name: true } } },
    orderBy: [{ name: "asc" }],
  });
}

export async function getVisibleExercise(userId: string, exerciseId: string) {
  const visible = await visibleExerciseWhere(userId);
  return prisma.exercise.findFirst({
    where: { AND: [{ id: exerciseId }, visible] },
    include: { team: { select: { id: true, name: true } } },
  });
}

export const EXERCISE_CATEGORIES = [
  "WARMUP",
  "STRENGTH",
  "SPEED",
  "AGILITY",
  "CONDITIONING",
  "MOBILITY",
  "SKILL",
  "RECOVERY",
  "COOLDOWN",
] as const;

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type ExerciseRecord = {
  id: string;
  name: string;
  category: string;
  sport: string | null;
  positions: string | null;
  movementPattern: string | null;
  equipment: string | null;
  instructions: string | null;
  coachingCues: string | null;
  videoUrl: string | null;
  teamId: string | null;
  team: { id: string; name: string } | null;
  createdAt: Date;
};

/** Single response shape for both the list and detail exercise routes, so they can never drift. */
export function toExerciseJson(e: ExerciseRecord) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    sport: e.sport,
    positions: parseJsonArray(e.positions),
    movementPattern: e.movementPattern,
    equipment: parseJsonArray(e.equipment),
    instructions: e.instructions,
    coachingCues: e.coachingCues,
    videoUrl: e.videoUrl,
    isGlobal: e.teamId === null,
    teamName: e.team?.name ?? null,
    createdAt: e.createdAt,
  };
}
