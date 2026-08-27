import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, hasTeamPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const assignments = await prisma.filmAssignment.findMany({
    where: { teamId },
    include: {
      film: { select: { title: true } },
      playlist: { select: { title: true } },
      clip: { select: { label: true } },
      positionGroup: { select: { name: true } },
      targets: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      instructions: a.instructions,
      dueAt: a.dueAt,
      requiredViewing: a.requiredViewing,
      positionGroupName: a.positionGroup?.name ?? null,
      filmTitle: a.film?.title ?? null,
      playlistTitle: a.playlist?.title ?? null,
      clipLabel: a.clip?.label ?? null,
      targetCount: a.targets.length,
      completedCount: a.targets.filter((t) => t.status === "COMPLETED").length,
      myTarget: a.targets.find((t) => t.userId === user.id) ?? null,
      createdAt: a.createdAt,
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const instructions = typeof body?.instructions === "string" ? body.instructions.trim() : undefined;
  const filmId = typeof body?.filmId === "string" ? body.filmId : null;
  const playlistId = typeof body?.playlistId === "string" ? body.playlistId : null;
  const clipId = typeof body?.clipId === "string" ? body.clipId : null;
  const positionGroupId = typeof body?.positionGroupId === "string" ? body.positionGroupId : null;
  const dueAt = typeof body?.dueAt === "string" && body.dueAt ? new Date(body.dueAt) : null;
  const requiredViewing = body?.requiredViewing !== false;
  const explicitTargetUserIds: string[] = Array.isArray(body?.targetUserIds) ? body.targetUserIds.filter((x: unknown) => typeof x === "string") : [];

  if (!title || title.length > 160) {
    return NextResponse.json({ error: "Enter a title (up to 160 characters)." }, { status: 400 });
  }
  const sourceCount = [filmId, playlistId, clipId].filter(Boolean).length;
  if (sourceCount !== 1) {
    return NextResponse.json({ error: "Choose exactly one of film, playlist, or clip to assign." }, { status: 400 });
  }
  if (!(await hasTeamPermission(user.id, teamId, "CREATE_ASSIGNMENT", positionGroupId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (positionGroupId) {
    const group = await prisma.positionGroup.findUnique({ where: { id: positionGroupId } });
    if (!group || group.teamId !== teamId) return NextResponse.json({ error: "Invalid position group." }, { status: 400 });
  }

  let targetUserIds = explicitTargetUserIds;
  if (targetUserIds.length === 0) {
    if (positionGroupId) {
      const members = await prisma.positionGroupMembership.findMany({ where: { positionGroupId }, select: { userId: true } });
      targetUserIds = members.map((m) => m.userId);
    } else {
      const members = await prisma.teamMembership.findMany({ where: { teamId, teamRole: "ATHLETE" }, select: { userId: true } });
      targetUserIds = members.map((m) => m.userId);
    }
  }
  if (targetUserIds.length === 0) {
    return NextResponse.json({ error: "No athletes to assign this to." }, { status: 400 });
  }

  const assignment = await prisma.filmAssignment.create({
    data: {
      teamId,
      positionGroupId,
      assignedById: user.id,
      title,
      instructions,
      filmId,
      playlistId,
      clipId,
      dueAt,
      requiredViewing,
      targets: { create: targetUserIds.map((userId) => ({ userId })) },
    },
  });

  await prisma.notification.createMany({
    data: targetUserIds.map((userId) => ({
      userId,
      type: "FILM",
      title: `New film assignment: ${title}`,
      link: "/assignments",
    })),
  });

  await logAudit({ actorId: user.id, action: "film_assignment.created", targetType: "FilmAssignment", targetId: assignment.id });

  return NextResponse.json({ assignment });
}
