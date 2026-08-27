import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm, isTeamFilmStaff } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

/** Everyone who can view the film can comment on it — commenting is not gated by a separate permission because it's the baseline collaboration feature the Film Center is built around. PRIVATE comments are only shown back to their author and the team's coaching staff. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isStaff = film.teamId ? await isTeamFilmStaff(user.id, film.teamId) : false;

  const comments = await prisma.filmComment.findMany({
    where: {
      filmId,
      deletedAt: null,
      OR: [{ visibility: "SHARED" }, { authorId: user.id }, ...(isStaff ? [{ visibility: "PRIVATE" }] : [])],
    },
    orderBy: { createdAt: "asc" },
  });

  const authors = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(comments.map((c) => c.authorId))) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(authors.map((a) => [a.id, a.name]));

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      clipId: c.clipId,
      authorId: c.authorId,
      authorName: nameById.get(c.authorId) ?? "Unknown",
      timestampSec: c.timestampSec,
      body: c.body,
      visibility: c.visibility,
      parentId: c.parentId,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      isMine: c.authorId === user.id,
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const timestampSec = typeof body?.timestampSec === "number" ? body.timestampSec : null;
  const clipId = typeof body?.clipId === "string" ? body.clipId : null;
  const parentId = typeof body?.parentId === "string" ? body.parentId : null;
  const visibility = body?.visibility === "PRIVATE" ? "PRIVATE" : "SHARED";

  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Enter a comment (up to 2000 characters)." }, { status: 400 });
  }
  if (visibility === "PRIVATE" && !(film.teamId && (await isTeamFilmStaff(user.id, film.teamId)))) {
    return NextResponse.json({ error: "Only coaching staff can leave private comments." }, { status: 403 });
  }
  if (parentId) {
    const parent = await prisma.filmComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.filmId !== filmId) return NextResponse.json({ error: "Invalid reply target." }, { status: 400 });
  }
  if (clipId) {
    const clip = await prisma.clip.findUnique({ where: { id: clipId } });
    if (!clip || clip.filmId !== filmId) return NextResponse.json({ error: "Invalid clip." }, { status: 400 });
  }

  const comment = await prisma.filmComment.create({
    data: { filmId, clipId, authorId: user.id, timestampSec, body: text, visibility, parentId },
  });

  if (film.uploadedById !== user.id && visibility === "SHARED") {
    await prisma.notification.create({
      data: {
        userId: film.uploadedById,
        type: "FILM",
        title: `New comment on ${film.title}`,
        link: `/film/${filmId}`,
      },
    });
  }

  await logAudit({ actorId: user.id, action: "film_comment.created", targetType: "FilmComment", targetId: comment.id });

  return NextResponse.json({
    comment: {
      id: comment.id,
      clipId: comment.clipId,
      authorId: comment.authorId,
      authorName: user.name,
      timestampSec: comment.timestampSec,
      body: comment.body,
      visibility: comment.visibility,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      editedAt: null,
      isMine: true,
    },
  });
}
