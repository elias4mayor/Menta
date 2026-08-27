import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm, canManageFilm } from "@/lib/permissions";
import { deleteFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const film = await prisma.film.findUnique({
    where: { id },
    include: {
      team: true,
      uploadedBy: true,
      clips: { include: { createdBy: true }, orderBy: { startSec: "asc" } },
    },
  });
  if (!film) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canViewFilm(user, film))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    film: {
      id: film.id,
      title: film.title,
      description: film.description,
      category: film.category,
      opponent: film.opponent,
      opponentId: film.opponentId,
      season: film.season,
      visibility: film.visibility,
      status: film.status,
      positionGroupId: film.positionGroupId,
      mimeType: film.mimeType,
      sizeBytes: film.sizeBytes,
      durationSec: film.durationSec,
      teamId: film.teamId,
      teamName: film.team?.name ?? null,
      uploadedByName: film.uploadedBy.name,
      isMine: film.uploadedById === user.id,
      canManage: await canManageFilm(user, film),
      createdAt: film.createdAt,
      clips: film.clips.map((c) => ({
        id: c.id,
        startSec: c.startSec,
        endSec: c.endSec,
        label: c.label,
        notes: c.notes,
        createdByName: c.createdBy.name,
        isMine: c.createdById === user.id,
      })),
    },
  });
}

const patchSchema = z.object({ durationSec: z.coerce.number().min(0) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const film = await prisma.film.findUnique({ where: { id } });
  if (!film) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManageFilm(user, film))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  await prisma.film.update({ where: { id }, data: { durationSec: parsed.data.durationSec } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const film = await prisma.film.findUnique({ where: { id } });
  if (!film) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManageFilm(user, film))) {
    return NextResponse.json({ error: "Not authorized to delete this film." }, { status: 403 });
  }

  await prisma.film.delete({ where: { id } });
  await deleteFile(film.storageKey);
  await logAudit({ actorId: user.id, action: "film.deleted", targetType: "Film", targetId: id });

  return NextResponse.json({ ok: true });
}
