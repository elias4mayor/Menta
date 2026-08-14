import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const clip = await prisma.clip.findUnique({ where: { id }, include: { film: true } });
  if (!clip) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const canDelete = clip.createdById === user.id || clip.film.uploadedById === user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "You can't delete this clip." }, { status: 403 });
  }

  await prisma.clip.delete({ where: { id } });
  await logAudit({ actorId: user.id, action: "clip.deleted", targetType: "Clip", targetId: id });

  return NextResponse.json({ ok: true });
}
