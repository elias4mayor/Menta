import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { filmMetadataSchema } from "@/lib/validation";
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES, extensionForMimeType, saveFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const films = await prisma.film.findMany({
    where: {
      OR: [
        { uploadedById: user.id },
        { visibility: "PUBLIC" },
        { visibility: "TEAM", team: { memberships: { some: { userId: user.id } } } },
      ],
    },
    include: {
      team: true,
      uploadedBy: true,
      _count: { select: { clips: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    films: films.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      category: f.category,
      opponent: f.opponent,
      season: f.season,
      visibility: f.visibility,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      durationSec: f.durationSec,
      teamName: f.team?.name ?? null,
      uploadedByName: f.uploadedBy.name,
      isMine: f.uploadedById === user.id,
      clipCount: f._count.clips,
      createdAt: f.createdAt,
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
    return NextResponse.json({ error: "No video file provided." }, { status: 400 });
  }
  if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) {
    return NextResponse.json(
      { error: `Unsupported video type: ${file.type || "unknown"}.` },
      { status: 415 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }

  const parsed = filmMetadataSchema.safeParse({
    title: form.get("title") ?? undefined,
    description: form.get("description") || undefined,
    category: form.get("category") || undefined,
    opponent: form.get("opponent") || undefined,
    season: form.get("season") || undefined,
    visibility: form.get("visibility") || undefined,
    teamId: form.get("teamId") || undefined,
    durationSec: form.get("durationSec") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (parsed.data.teamId) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: parsed.data.teamId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
    }
  }

  const key = `films/${crypto.randomUUID()}.${extensionForMimeType(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveFile(key, buffer);

  const film = await prisma.film.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      opponent: parsed.data.opponent,
      season: parsed.data.season,
      visibility: parsed.data.visibility,
      teamId: parsed.data.teamId,
      durationSec: parsed.data.durationSec,
      storageKey: key,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  if (parsed.data.teamId) {
    const members = await prisma.teamMembership.findMany({
      where: { teamId: parsed.data.teamId, userId: { not: user.id } },
    });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: "FILM",
          title: `New film: ${film.title}`,
          link: "/film",
        })),
      });
    }
  }

  await logAudit({ actorId: user.id, action: "film.uploaded", targetType: "Film", targetId: film.id });

  return NextResponse.json({ film: { id: film.id, title: film.title } });
}
