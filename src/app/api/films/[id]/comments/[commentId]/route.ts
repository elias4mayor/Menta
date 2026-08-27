import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageFilm } from "@/lib/permissions";

async function requireComment(filmId: string, commentId: string) {
  const comment = await prisma.filmComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.filmId !== filmId || comment.deletedAt) return null;
  return comment;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId, commentId } = await context.params;
  const comment = await requireComment(filmId, commentId);
  if (!comment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (comment.authorId !== user.id) return NextResponse.json({ error: "Only the author can edit this comment." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Enter a comment (up to 2000 characters)." }, { status: 400 });
  }

  const updated = await prisma.filmComment.update({
    where: { id: commentId },
    data: { body: text, editedAt: new Date() },
  });

  return NextResponse.json({ comment: { id: updated.id, body: updated.body, editedAt: updated.editedAt } });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId, commentId } = await context.params;
  const comment = await requireComment(filmId, commentId);
  if (!comment) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const film = await prisma.film.findUnique({ where: { id: filmId } });
  const canManage = film && (await canManageFilm(user, film));
  if (comment.authorId !== user.id && !canManage) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.filmComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
