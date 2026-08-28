import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const note = await prisma.coachNote.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const canManage = note.coachId === user.id || (note.teamId && (await hasTeamPermission(user.id, note.teamId, "MANAGE_COACH_NOTES")));
  if (!canManage) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  await prisma.coachNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
