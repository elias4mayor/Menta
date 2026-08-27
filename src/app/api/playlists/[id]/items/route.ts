import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm } from "@/lib/permissions";
import { canManagePlaylist } from "@/lib/playlists";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: playlistId } = await params;

  const playlist = await prisma.filmPlaylist.findUnique({ where: { id: playlistId }, include: { _count: { select: { items: true } } } });
  if (!playlist) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManagePlaylist(user.id, playlist))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const filmId = typeof body?.filmId === "string" ? body.filmId : null;
  const clipId = typeof body?.clipId === "string" ? body.clipId : null;
  const note = typeof body?.note === "string" ? body.note.trim() : undefined;
  if (!filmId && !clipId) return NextResponse.json({ error: "Choose a film or clip to add." }, { status: 400 });
  if (filmId && clipId) return NextResponse.json({ error: "Add either a film or a clip, not both." }, { status: 400 });

  if (filmId) {
    const film = await prisma.film.findUnique({ where: { id: filmId } });
    if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Film not found." }, { status: 404 });
  }
  if (clipId) {
    const clip = await prisma.clip.findUnique({ where: { id: clipId }, include: { film: true } });
    if (!clip || !(await canViewFilm(user, clip.film))) return NextResponse.json({ error: "Clip not found." }, { status: 404 });
  }

  const item = await prisma.filmPlaylistItem.create({
    data: { playlistId, filmId, clipId, note, order: playlist._count.items },
  });
  await prisma.filmPlaylist.update({ where: { id: playlistId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ item });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: playlistId } = await params;

  const playlist = await prisma.filmPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManagePlaylist(user.id, playlist))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : null;
  if (!itemId) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const item = await prisma.filmPlaylistItem.findUnique({ where: { id: itemId } });
  if (!item || item.playlistId !== playlistId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.filmPlaylistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
