import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";
import { addPositionGroupMember, removePositionGroupMember, GROUP_ROLES, type GroupRole } from "@/lib/position-groups";
import { logAudit } from "@/lib/audit";

async function requireGroup(teamId: string, groupId: string) {
  const group = await prisma.positionGroup.findUnique({ where: { id: groupId } });
  if (!group || group.teamId !== teamId) return null;
  return group;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string; groupId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, groupId } = await params;

  if (!(await requireGroup(teamId, groupId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_POSITION_GROUPS", groupId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  const groupRole = typeof body?.groupRole === "string" ? body.groupRole : "ATHLETE";
  if (!userId || !GROUP_ROLES.includes(groupRole as GroupRole)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const membership = await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId } } });
  if (!membership) return NextResponse.json({ error: "That user isn't on this team." }, { status: 400 });

  const member = await addPositionGroupMember({ positionGroupId: groupId, userId, groupRole: groupRole as GroupRole });
  await logAudit({ actorId: user.id, action: "position_group.member_added", targetType: "PositionGroup", targetId: groupId });

  return NextResponse.json({ member });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; groupId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, groupId } = await params;

  if (!(await requireGroup(teamId, groupId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_POSITION_GROUPS", groupId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!userId) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  await removePositionGroupMember(groupId, userId);
  return NextResponse.json({ ok: true });
}
