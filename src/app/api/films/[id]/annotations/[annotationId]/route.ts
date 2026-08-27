import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; annotationId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId, annotationId } = await context.params;
  const annotation = await prisma.filmAnnotation.findUnique({ where: { id: annotationId } });
  if (!annotation || annotation.filmId !== filmId) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (annotation.createdById !== user.id) return NextResponse.json({ error: "Only the author can delete this." }, { status: 403 });

  await prisma.filmAnnotation.delete({ where: { id: annotationId } });
  return NextResponse.json({ ok: true });
}
