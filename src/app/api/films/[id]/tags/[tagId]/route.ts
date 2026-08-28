import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; tagId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId, tagId } = await context.params;
  const instance = await prisma.filmTagInstance.findUnique({ where: { id: tagId } });
  if (!instance || instance.filmId !== filmId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const film = await prisma.film.findUnique({ where: { id: filmId } });
  const canManageTags = film?.teamId && (await hasTeamPermission(user.id, film.teamId, "TAG_FILM", film.positionGroupId));
  if (instance.createdById !== user.id && !canManageTags) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.filmTagInstance.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
