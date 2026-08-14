import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createWorkoutSchema } from "@/lib/validation";
import { canManageTeam } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const workouts = await prisma.workout.findMany({
    where: {
      OR: [
        { createdById: user.id },
        { team: { memberships: { some: { userId: user.id } } } },
      ],
    },
    include: {
      team: true,
      completions: { where: { userId: user.id }, orderBy: { completedAt: "desc" }, take: 50 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    workouts: workouts.map((w) => ({
      id: w.id,
      title: w.title,
      category: w.category,
      description: w.description,
      exercises: w.exercises ? JSON.parse(w.exercises) : [],
      teamName: w.team?.name ?? null,
      yourCompletions: w.completions.length,
      lastCompletedAt: w.completions[0]?.completedAt ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createWorkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { teamId } = parsed.data;
  if (teamId) {
    const canManage = await canManageTeam(user, teamId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only coaches or team admins can add team workouts." },
        { status: 403 }
      );
    }
  }

  const workout = await prisma.workout.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      exercises: parsed.data.exercises ? JSON.stringify(parsed.data.exercises) : undefined,
      teamId,
      createdById: user.id,
    },
  });

  if (teamId) {
    const members = await prisma.teamMembership.findMany({ where: { teamId, userId: { not: user.id } } });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: "TRAINING",
          title: `New workout: ${workout.title}`,
          link: "/train",
        })),
      });
    }
  }

  await logAudit({ actorId: user.id, action: "workout.created", targetType: "Workout", targetId: workout.id });

  return NextResponse.json({ workout });
}
