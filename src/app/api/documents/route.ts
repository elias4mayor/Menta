import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { documentMetadataSchema } from "@/lib/validation";
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_UPLOAD_BYTES, extensionForMimeType, saveFile } from "@/lib/storage";
import { canManageTeam } from "@/lib/permissions";
import { documentStatus } from "@/lib/documents";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [guardianLinks, memberships] = await Promise.all([
    prisma.guardianLink.findMany({ where: { guardianId: user.id, status: "APPROVED" }, select: { athleteId: true } }),
    prisma.teamMembership.findMany({ where: { userId: user.id }, select: { teamId: true } }),
  ]);
  const athleteIds = guardianLinks.map((l) => l.athleteId);
  const teamIds = memberships.map((m) => m.teamId);

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { uploadedById: user.id },
        ...(athleteIds.length > 0 ? [{ ownerId: { in: athleteIds } }] : []),
        ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
      ],
    },
    include: {
      owner: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      expiresAt: d.expiresAt,
      status: documentStatus(d.expiresAt),
      notes: d.notes,
      ownerName: d.owner?.name ?? null,
      teamName: d.team?.name ?? null,
      uploadedByName: d.uploadedBy.name,
      isMine: d.ownerId === user.id || d.uploadedById === user.id,
      createdAt: d.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}.` }, { status: 415 });
  }
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_DOCUMENT_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }

  const parsed = documentMetadataSchema.safeParse({
    name: form.get("name") ?? undefined,
    category: form.get("category") || undefined,
    expiresAt: form.get("expiresAt") || undefined,
    notes: form.get("notes") || undefined,
    ownerId: form.get("ownerId") || undefined,
    teamId: form.get("teamId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, category, expiresAt, notes, teamId } = parsed.data;
  let ownerId = parsed.data.ownerId;

  if (teamId) {
    const canManage = await canManageTeam(user, teamId);
    if (!canManage) {
      return NextResponse.json({ error: "Only a coach or admin can add team documents." }, { status: 403 });
    }
    ownerId = undefined;
  } else {
    ownerId = ownerId || user.id;
    if (ownerId !== user.id) {
      const link = await prisma.guardianLink.findFirst({
        where: { guardianId: user.id, athleteId: ownerId, status: "APPROVED" },
      });
      if (!link) {
        return NextResponse.json(
          { error: "You can only add documents for yourself or an athlete you're an approved guardian for." },
          { status: 403 }
        );
      }
    }
  }

  const key = `documents/${crypto.randomUUID()}.${extensionForMimeType(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveFile(key, buffer);

  const document = await prisma.document.create({
    data: {
      name,
      category,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
      ownerId: teamId ? undefined : ownerId,
      teamId: teamId || undefined,
      storageKey: key,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  await logAudit({ actorId: user.id, action: "document.uploaded", targetType: "Document", targetId: document.id });

  return NextResponse.json({
    document: {
      id: document.id,
      name: document.name,
      category: document.category,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      expiresAt: document.expiresAt,
      status: documentStatus(document.expiresAt),
      notes: document.notes,
    },
  });
}
