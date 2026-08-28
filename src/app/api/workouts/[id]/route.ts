import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateWorkoutSchema } from "@/lib/validation";
import { canManageTeam, canManageWorkout } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.workout.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Workout not found." }, { status: 404 });
  if (!(await canManageWorkout(user, existing))) {
    return NextResponse.json({ error: "You don't have permission to edit this workout." }, { status: 403 });
  }

  const parsed = updateWorkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, category, description, exercises, teamId, assignedToId, isTemplate } = parsed.data;

  const nextTeamId = teamId === undefined ? existing.teamId : teamId;
  const nextAssignedToId = assignedToId === undefined ? existing.assignedToId : assignedToId;

  if (nextTeamId && nextTeamId !== existing.teamId) {
    if (!(await canManageTeam(user, nextTeamId))) {
      return NextResponse.json({ error: "Only coaches or team admins can assign to that team." }, { status: 403 });
    }
  }
  if (nextAssignedToId) {
    if (!nextTeamId) {
      return NextResponse.json({ error: "Assigning to an athlete requires selecting their team." }, { status: 400 });
    }
    const membership = await prisma.teamMembership.findFirst({ where: { teamId: nextTeamId, userId: nextAssignedToId } });
    if (!membership) {
      return NextResponse.json({ error: "That athlete isn't a member of the selected team." }, { status: 400 });
    }
  }

  const workout = await prisma.workout.update({
    where: { id },
    data: {
      title,
      category,
      description: description === "" ? null : description,
      exercises: exercises ? JSON.stringify(exercises) : undefined,
      teamId: teamId === undefined ? undefined : teamId,
      assignedToId: assignedToId === undefined ? undefined : assignedToId,
      isTemplate,
    },
  });

  await logAudit({ actorId: user.id, action: "workout.updated", targetType: "Workout", targetId: workout.id });

  return NextResponse.json({ workout });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.workout.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Workout not found." }, { status: 404 });
  if (!(await canManageWorkout(user, existing))) {
    return NextResponse.json({ error: "You don't have permission to delete this workout." }, { status: 403 });
  }

  await prisma.workout.delete({ where: { id } });
  await logAudit({ actorId: user.id, action: "workout.deleted", targetType: "Workout", targetId: id });

  return NextResponse.json({ ok: true });
}
