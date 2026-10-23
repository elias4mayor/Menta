import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logWorkoutCompletionSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let canLog = workout.createdById === user.id || workout.assignedToId === user.id;
  if (!canLog && workout.teamId) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: workout.teamId } },
    });
    canLog = Boolean(membership);
  }
  if (!canLog) {
    return NextResponse.json({ error: "You don't have access to this workout." }, { status: 403 });
  }
  if (workout.isTemplate) return NextResponse.json({ error: "Use this template to create a workout before starting." }, { status: 400 });

  const parsed = logWorkoutCompletionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // A stable client-generated ID makes a lost-response retry safe. The primary
  // key also handles concurrent retries atomically, without a schema migration.
  const completionId = parsed.data.completionId;
  let completion = completionId ? await prisma.workoutCompletion.findUnique({ where: { id: completionId } }) : null;
  if (completion && (completion.userId !== user.id || completion.workoutId !== id)) {
    return NextResponse.json({ error: "This completion ID cannot be reused for this workout." }, { status: 409 });
  }
  let created = false;
  if (!completion) {
    try {
      completion = await prisma.workoutCompletion.create({
        data: {
          id: completionId,
          workoutId: id,
          userId: user.id,
          effort: parsed.data.effort,
          notes: parsed.data.notes,
        },
      });
      created = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || !completionId) throw error;
      completion = await prisma.workoutCompletion.findUnique({ where: { id: completionId } });
      if (!completion || completion.userId !== user.id || completion.workoutId !== id) {
        return NextResponse.json({ error: "This completion ID cannot be reused for this workout." }, { status: 409 });
      }
    }
  }

  if (created) await logAudit({ actorId: user.id, action: "workout.completed", targetType: "Workout", targetId: id });

  const summary = await prisma.workoutCompletion.aggregate({
    where: { workoutId: id, userId: user.id }, _count: true, _max: { completedAt: true },
  });
  return NextResponse.json({ completion, summary: { count: summary._count, lastCompletedAt: summary._max.completedAt?.toISOString() ?? null } });
}
