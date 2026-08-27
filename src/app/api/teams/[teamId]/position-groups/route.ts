import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, hasTeamPermission } from "@/lib/permissions";
import { createPositionGroup, listPositionGroups } from "@/lib/position-groups";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  const role = await getTeamRole(user.id, teamId);
  if (!role && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
  }

  const groups = await listPositionGroups(teamId);
  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      filmCount: g._count.films,
      members: g.memberships.map((m) => ({ userId: m.userId, name: m.user.name, groupRole: m.groupRole })),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_POSITION_GROUPS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Enter a group name (up to 80 characters)." }, { status: 400 });
  }

  const group = await createPositionGroup({ teamId, name, description, createdById: user.id });
  await logAudit({ actorId: user.id, action: "position_group.created", targetType: "PositionGroup", targetId: group.id });

  return NextResponse.json({ group });
}
