import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { documentUpdateSchema } from "@/lib/validation";
import { canAccessDocument, canManageDocument } from "@/lib/permissions";
import { deleteFile } from "@/lib/storage";
import { documentStatus } from "@/lib/documents";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true } }, team: { select: { id: true, name: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canAccessDocument(user, doc))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    document: {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      expiresAt: doc.expiresAt,
      status: documentStatus(doc.expiresAt),
      notes: doc.notes,
      ownerName: doc.owner?.name ?? null,
      teamName: doc.team?.name ?? null,
      canManage: await canManageDocument(user, doc),
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManageDocument(user, doc))) {
    return NextResponse.json({ error: "You can't edit this document." }, { status: 403 });
  }

  const parsed = documentUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, category, expiresAt, notes } = parsed.data;
  const updated = await prisma.document.update({
    where: { id },
    data: {
      name,
      category,
      notes,
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
    },
  });

  await logAudit({ actorId: user.id, action: "document.updated", targetType: "Document", targetId: updated.id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManageDocument(user, doc))) {
    return NextResponse.json({ error: "You can't delete this document." }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });
  await deleteFile(doc.storageKey);

  await logAudit({ actorId: user.id, action: "document.deleted", targetType: "Document", targetId: id });

  return NextResponse.json({ ok: true });
}
