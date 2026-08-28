import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; definitionId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, definitionId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_FILM_TAGS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const definition = await prisma.filmTagDefinition.findUnique({ where: { id: definitionId } });
  if (!definition || definition.teamId !== teamId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.filmTagDefinition.delete({ where: { id: definitionId } });
  return NextResponse.json({ ok: true });
}
