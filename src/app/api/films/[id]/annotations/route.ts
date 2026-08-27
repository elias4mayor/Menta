import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm, hasTeamPermission } from "@/lib/permissions";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const annotations = await prisma.filmAnnotation.findMany({ where: { filmId }, orderBy: { timestampSec: "asc" } });
  return NextResponse.json({
    annotations: annotations.map((a) => ({
      id: a.id,
      clipId: a.clipId,
      timestampSec: a.timestampSec,
      data: a.data,
      visibility: a.visibility,
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!film.teamId || !(await hasTeamPermission(user.id, film.teamId, "ANNOTATE_FILM", film.positionGroupId))) {
    return NextResponse.json({ error: "Not authorized to annotate this film." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const timestampSec = typeof body?.timestampSec === "number" ? body.timestampSec : null;
  const clipId = typeof body?.clipId === "string" ? body.clipId : null;
  const shapes = Array.isArray(body?.shapes) ? body.shapes : null;
  const visibility = body?.visibility === "PRIVATE" ? "PRIVATE" : "SHARED";
  if (timestampSec === null || !shapes) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const annotation = await prisma.filmAnnotation.create({
    data: { filmId, clipId, createdById: user.id, timestampSec, data: JSON.stringify(shapes), visibility },
  });

  return NextResponse.json({
    annotation: {
      id: annotation.id,
      clipId: annotation.clipId,
      timestampSec: annotation.timestampSec,
      data: annotation.data,
      visibility: annotation.visibility,
    },
  });
}
