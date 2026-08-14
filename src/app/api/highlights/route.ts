import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm } from "@/lib/permissions";
import { createHighlightSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const highlights = await prisma.highlight.findMany({
    where: { userId: user.id },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { clip: { include: { film: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    highlights: highlights.map((h) => ({
      id: h.id,
      title: h.title,
      createdAt: h.createdAt,
      clips: h.items.map((item) => ({
        id: item.clip.id,
        label: item.clip.label,
        startSec: item.clip.startSec,
        endSec: item.clip.endSec,
        filmId: item.clip.filmId,
        filmTitle: item.clip.film.title,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createHighlightSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const clips = await prisma.clip.findMany({
    where: { id: { in: parsed.data.clipIds } },
    include: { film: true },
  });
  if (clips.length !== parsed.data.clipIds.length) {
    return NextResponse.json({ error: "One or more clips weren't found." }, { status: 404 });
  }
  for (const clip of clips) {
    if (!(await canViewFilm(user, clip.film))) {
      return NextResponse.json({ error: "You don't have access to one of these clips." }, { status: 403 });
    }
  }

  const highlight = await prisma.highlight.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      items: {
        create: parsed.data.clipIds.map((clipId, index) => ({ clipId, order: index })),
      },
    },
  });

  await logAudit({ actorId: user.id, action: "highlight.created", targetType: "Highlight", targetId: highlight.id });

  return NextResponse.json({ highlight: { id: highlight.id } });
}
