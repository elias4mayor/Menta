import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm, hasTeamPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const instances = await prisma.filmTagInstance.findMany({
    where: { filmId },
    include: { tagDefinition: true },
    orderBy: { timestampSec: "asc" },
  });

  return NextResponse.json({
    tags: instances.map((t) => ({
      id: t.id,
      clipId: t.clipId,
      label: t.tagDefinition.label,
      category: t.tagDefinition.category,
      timestampSec: t.timestampSec,
      athleteId: t.athleteId,
      notes: t.notes,
      createdById: t.createdById,
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!film.teamId || !(await hasTeamPermission(user.id, film.teamId, "TAG_FILM", film.positionGroupId))) {
    return NextResponse.json({ error: "Not authorized to tag this film." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const tagDefinitionId = typeof body?.tagDefinitionId === "string" ? body.tagDefinitionId : null;
  const timestampSec = typeof body?.timestampSec === "number" ? body.timestampSec : null;
  const clipId = typeof body?.clipId === "string" ? body.clipId : null;
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : null;
  const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;
  if (!tagDefinitionId) return NextResponse.json({ error: "Choose a tag." }, { status: 400 });

  const definition = await prisma.filmTagDefinition.findUnique({ where: { id: tagDefinitionId } });
  if (!definition || definition.teamId !== film.teamId) {
    return NextResponse.json({ error: "Invalid tag." }, { status: 400 });
  }

  const instance = await prisma.filmTagInstance.create({
    data: { filmId, clipId, tagDefinitionId, timestampSec, athleteId, notes, createdById: user.id },
  });

  await logAudit({ actorId: user.id, action: "film_tag.created", targetType: "FilmTagInstance", targetId: instance.id });

  return NextResponse.json({
    tag: {
      id: instance.id,
      clipId: instance.clipId,
      label: definition.label,
      category: definition.category,
      timestampSec: instance.timestampSec,
      athleteId: instance.athleteId,
      notes: instance.notes,
      createdById: instance.createdById,
    },
  });
}
