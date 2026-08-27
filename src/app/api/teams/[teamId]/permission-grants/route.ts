import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission, isPermission, grantTeamPermission, isTeamCoachOrAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await isTeamCoachOrAdmin(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const grants = await prisma.teamPermissionGrant.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true } }, positionGroup: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    grants: grants.map((g) => ({
      id: g.id,
      userId: g.userId,
      userName: g.user.name,
      permission: g.permission,
      positionGroupId: g.positionGroupId,
      positionGroupName: g.positionGroup?.name ?? null,
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "GRANT_PERMISSIONS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetUserId = typeof body?.userId === "string" ? body.userId : null;
  const permission = typeof body?.permission === "string" ? body.permission : null;
  const positionGroupId = typeof body?.positionGroupId === "string" ? body.positionGroupId : null;
  if (!targetUserId || !permission || !isPermission(permission)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: targetUserId, teamId } },
  });
  if (!membership) return NextResponse.json({ error: "That user isn't on this team." }, { status: 400 });

  if (positionGroupId) {
    const group = await prisma.positionGroup.findUnique({ where: { id: positionGroupId } });
    if (!group || group.teamId !== teamId) {
      return NextResponse.json({ error: "Invalid position group." }, { status: 400 });
    }
  }

  await grantTeamPermission({ teamId, userId: targetUserId, positionGroupId, permission, grantedById: user.id });
  await logAudit({
    actorId: user.id,
    action: "team_permission.granted",
    targetType: "User",
    targetId: targetUserId,
    metadata: { permission, positionGroupId, teamId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "GRANT_PERMISSIONS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const grantId = typeof body?.grantId === "string" ? body.grantId : null;
  if (!grantId) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const grant = await prisma.teamPermissionGrant.findUnique({ where: { id: grantId } });
  if (!grant || grant.teamId !== teamId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.teamPermissionGrant.delete({ where: { id: grantId } });
  await logAudit({ actorId: user.id, action: "team_permission.revoked", targetType: "TeamPermissionGrant", targetId: grantId });

  return NextResponse.json({ ok: true });
}
