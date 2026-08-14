import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logWorkoutCompletionSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let canLog = workout.createdById === user.id;
  if (!canLog && workout.teamId) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: workout.teamId } },
    });
    canLog = Boolean(membership);
  }
  if (!canLog) {
    return NextResponse.json({ error: "You don't have access to this workout." }, { status: 403 });
  }

  const parsed = logWorkoutCompletionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const completion = await prisma.workoutCompletion.create({
    data: {
      workoutId: id,
      userId: user.id,
      effort: parsed.data.effort,
      notes: parsed.data.notes,
    },
  });

  await logAudit({ actorId: user.id, action: "workout.completed", targetType: "Workout", targetId: id });

  return NextResponse.json({ completion });
}
