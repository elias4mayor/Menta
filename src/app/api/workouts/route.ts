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
        { assignedToId: user.id },
        // A teammate's/coach's real (non-template) workouts on a shared team
        // — a template stays private to whoever created it until they
        // duplicate it into a real, assigned workout.
        { AND: [{ team: { memberships: { some: { userId: user.id } } } }, { isTemplate: false }] },
      ],
    },
    include: {
      team: true,
      assignedTo: { select: { id: true, name: true } },
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
      teamId: w.teamId,
      teamName: w.team?.name ?? null,
      assignedToId: w.assignedToId,
      assignedToName: w.assignedTo?.name ?? null,
      isTemplate: w.isTemplate,
      canManage: w.createdById === user.id,
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

  const { teamId, assignedToId, isTemplate } = parsed.data;
  if (teamId) {
    const canManage = await canManageTeam(user, teamId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only coaches or team admins can add team workouts." },
        { status: 403 }
      );
    }
  }

  if (assignedToId) {
    if (!teamId) {
      return NextResponse.json({ error: "Assigning to an athlete requires selecting their team." }, { status: 400 });
    }
    const membership = await prisma.teamMembership.findFirst({ where: { teamId, userId: assignedToId } });
    if (!membership) {
      return NextResponse.json({ error: "That athlete isn't a member of the selected team." }, { status: 400 });
    }
  }

  const workout = await prisma.workout.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      exercises: parsed.data.exercises ? JSON.stringify(parsed.data.exercises) : undefined,
      teamId,
      assignedToId,
      isTemplate: isTemplate ?? false,
      createdById: user.id,
    },
  });

  // Templates are a personal library entry, not a live assignment — no
  // notifications go out until it's duplicated into a real workout.
  if (!isTemplate) {
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: "TRAINING",
          title: `New workout assigned: ${workout.title}`,
          link: "/train",
        },
      });
    } else if (teamId) {
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
  }

  await logAudit({ actorId: user.id, action: "workout.created", targetType: "Workout", targetId: workout.id });

  return NextResponse.json({ workout });
}
