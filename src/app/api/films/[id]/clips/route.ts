import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm } from "@/lib/permissions";
import { createClipSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canViewFilm(user, film))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const parsed = createClipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const clip = await prisma.clip.create({
    data: {
      filmId,
      createdById: user.id,
      startSec: parsed.data.startSec,
      endSec: parsed.data.endSec,
      label: parsed.data.label,
      notes: parsed.data.notes,
    },
  });

  await logAudit({ actorId: user.id, action: "clip.created", targetType: "Clip", targetId: clip.id });

  return NextResponse.json({ clip });
}
