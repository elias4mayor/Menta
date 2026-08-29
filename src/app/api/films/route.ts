import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { filmMetadataSchema } from "@/lib/validation";
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES, extensionForMimeType, saveFile } from "@/lib/storage";
import { canUploadFilmToTeam } from "@/lib/permissions";
import { visibleFilmWhere } from "@/lib/film-visibility";
import { logAudit } from "@/lib/audit";
import { getCurrentStateLimit } from "@/lib/entitlements";

const BYTES_PER_GB = 1024 * 1024 * 1024;

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const films = await prisma.film.findMany({
    where: await visibleFilmWhere(user.id),
    include: {
      team: true,
      positionGroup: { select: { id: true, name: true } },
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
      status: f.status,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      durationSec: f.durationSec,
      teamName: f.team?.name ?? null,
      positionGroupName: f.positionGroup?.name ?? null,
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
    opponentId: form.get("opponentId") || undefined,
    season: form.get("season") || undefined,
    visibility: form.get("visibility") || undefined,
    teamId: form.get("teamId") || undefined,
    positionGroupId: form.get("positionGroupId") || undefined,
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

  if (parsed.data.positionGroupId) {
    if (!parsed.data.teamId) {
      return NextResponse.json({ error: "A position group requires a team." }, { status: 400 });
    }
    const group = await prisma.positionGroup.findUnique({ where: { id: parsed.data.positionGroupId } });
    if (!group || group.teamId !== parsed.data.teamId) {
      return NextResponse.json({ error: "Invalid position group." }, { status: 400 });
    }
  }
  if (parsed.data.visibility === "POSITION_GROUP" && !parsed.data.positionGroupId) {
    return NextResponse.json({ error: "Choose a position group for this visibility." }, { status: 400 });
  }

  if (!(await canUploadFilmToTeam(user.id, parsed.data.teamId ?? null, parsed.data.positionGroupId ?? null))) {
    return NextResponse.json({ error: "Not authorized to upload film for that team." }, { status: 403 });
  }

  if (parsed.data.opponentId) {
    const opponent = await prisma.opponent.findUnique({ where: { id: parsed.data.opponentId } });
    if (!opponent || opponent.teamId !== parsed.data.teamId) {
      return NextResponse.json({ error: "Invalid opponent." }, { status: 400 });
    }
  }

  const storageLimitGb = await getCurrentStateLimit(user.id, "FILM_STORAGE_GB");
  if (storageLimitGb !== null) {
    const { _sum } = await prisma.film.aggregate({ where: { uploadedById: user.id }, _sum: { sizeBytes: true } });
    const usedBytes = _sum.sizeBytes ?? 0;
    if (usedBytes + file.size > storageLimitGb * BYTES_PER_GB) {
      return NextResponse.json({
        error: `This upload would put you over your ${storageLimitGb}GB film storage limit. Delete some film or upgrade for more.`,
      }, { status: 402 });
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
      opponentId: parsed.data.opponentId,
      season: parsed.data.season,
      visibility: parsed.data.visibility,
      teamId: parsed.data.teamId,
      positionGroupId: parsed.data.positionGroupId,
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
