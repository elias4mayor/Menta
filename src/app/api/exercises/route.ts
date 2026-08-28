import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { listVisibleExercises, toExerciseJson, EXERCISE_CATEGORIES } from "@/lib/exercises";
import { canManageTeamExercises } from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const url = new URL(request.url);
  const exercises = await listVisibleExercises(user.id, {
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    sport: url.searchParams.get("sport") ?? undefined,
    position: url.searchParams.get("position") ?? undefined,
    equipment: url.searchParams.get("equipment") ?? undefined,
  });

  return NextResponse.json({ exercises: exercises.map(toExerciseJson) });
}

/**
 * Creates a team-custom exercise only — global (teamId: null) library
 * entries are seed data (prisma/seed-exercises.ts), never client-created.
 * teamId is required in the body and is only ever used to run a real,
 * DB-backed permission check (canManageTeamExercises) — it is never
 * trusted on its own, so a client cannot grant themselves access to a
 * team they don't actually hold MANAGE_EXERCISE_LIBRARY (or coach/admin)
 * on by simply naming a different team's id.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  if (!teamId) return NextResponse.json({ error: "teamId is required." }, { status: 400 });

  if (!(await canManageTeamExercises(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = typeof body?.category === "string" ? body.category : "";
  if (!name || name.length > 160) {
    return NextResponse.json({ error: "Enter a name (up to 160 characters)." }, { status: 400 });
  }
  if (!(EXERCISE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const sport = typeof body?.sport === "string" && body.sport.trim() ? body.sport.trim() : null;
  const instructions =
    typeof body?.instructions === "string" && body.instructions.trim() ? body.instructions.trim() : null;
  const coachingCues =
    typeof body?.coachingCues === "string" && body.coachingCues.trim() ? body.coachingCues.trim() : null;
  const equipmentList: string[] = Array.isArray(body?.equipment)
    ? body.equipment.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  const exercise = await prisma.exercise.create({
    data: {
      teamId,
      sport,
      name,
      category,
      instructions,
      coachingCues,
      equipment: equipmentList.length > 0 ? JSON.stringify(equipmentList) : null,
      createdById: user.id,
    },
    include: { team: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ exercise: toExerciseJson(exercise) });
}
