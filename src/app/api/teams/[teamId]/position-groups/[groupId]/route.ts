import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";
import { renamePositionGroup, deletePositionGroup } from "@/lib/position-groups";
import { logAudit } from "@/lib/audit";

async function requireGroup(teamId: string, groupId: string) {
  const group = await prisma.positionGroup.findUnique({ where: { id: groupId } });
  if (!group || group.teamId !== teamId) return null;
  return group;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; groupId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, groupId } = await params;

  if (!(await requireGroup(teamId, groupId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_POSITION_GROUPS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  if (name !== undefined && (!name || name.length > 80)) {
    return NextResponse.json({ error: "Enter a group name (up to 80 characters)." }, { status: 400 });
  }

  const group = await renamePositionGroup(groupId, { name, description });
  return NextResponse.json({ group });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; groupId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, groupId } = await params;

  if (!(await requireGroup(teamId, groupId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_POSITION_GROUPS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await deletePositionGroup(groupId);
  await logAudit({ actorId: user.id, action: "position_group.deleted", targetType: "PositionGroup", targetId: groupId });

  return NextResponse.json({ ok: true });
}
