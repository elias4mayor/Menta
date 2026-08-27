import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canAccessPlaylist, canManagePlaylist } from "@/lib/playlists";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const playlist = await prisma.filmPlaylist.findUnique({
    where: { id },
    include: {
      items: {
        include: { film: { select: { id: true, title: true } }, clip: { select: { id: true, label: true, filmId: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!playlist || !(await canAccessPlaylist(user.id, playlist))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      visibility: playlist.visibility,
      canManage: await canManagePlaylist(user.id, playlist),
      items: playlist.items.map((i) => ({
        id: i.id,
        order: i.order,
        note: i.note,
        filmId: i.filmId,
        filmTitle: i.film?.title ?? null,
        clipId: i.clipId,
        clipLabel: i.clip?.label ?? null,
        clipFilmId: i.clip?.filmId ?? null,
      })),
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const playlist = await prisma.filmPlaylist.findUnique({ where: { id } });
  if (!playlist) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManagePlaylist(user.id, playlist))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : undefined;
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  if (title !== undefined && (!title || title.length > 120)) {
    return NextResponse.json({ error: "Enter a title (up to 120 characters)." }, { status: 400 });
  }

  const updated = await prisma.filmPlaylist.update({ where: { id }, data: { title, description } });
  return NextResponse.json({ playlist: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const playlist = await prisma.filmPlaylist.findUnique({ where: { id } });
  if (!playlist) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManagePlaylist(user.id, playlist))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  await prisma.filmPlaylist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
