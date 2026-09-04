import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_UPLOAD_BYTES,
  extensionForMimeType,
  isUploadStorageConfigured,
  saveFile,
  deleteFile,
} from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!isUploadStorageConfigured()) {
    return NextResponse.json(
      { error: "Avatar storage isn't configured yet. An administrator needs to set up object storage." },
      { status: 503 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type || "unknown"}.` }, { status: 415 });
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image too large. Max ${Math.round(MAX_AVATAR_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }

  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true } });

  const key = `avatars/${user.id}-${crypto.randomUUID()}.${extensionForMimeType(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveFile(key, buffer, file.type);

  await prisma.user.update({ where: { id: user.id }, data: { avatarKey: key, avatarMime: file.type } });

  if (previous?.avatarKey) {
    await deleteFile(previous.avatarKey).catch(() => {});
  }

  await logAudit({ actorId: user.id, action: "avatar.updated" });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarKey: null, avatarMime: null } });
  if (current?.avatarKey) {
    await deleteFile(current.avatarKey).catch(() => {});
  }

  await logAudit({ actorId: user.id, action: "avatar.removed" });

  return NextResponse.json({ ok: true });
}
