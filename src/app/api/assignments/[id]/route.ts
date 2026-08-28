import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const assignment = await prisma.filmAssignment.findUnique({ where: { id } });
  if (!assignment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const canManage =
    assignment.assignedById === user.id ||
    (await hasTeamPermission(user.id, assignment.teamId, "MANAGE_ASSIGNMENTS", assignment.positionGroupId));
  if (!canManage) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  await prisma.filmAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
