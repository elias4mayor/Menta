import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, hasTeamPermission } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: opponentId } = await params;

  const opponent = await prisma.opponent.findUnique({ where: { id: opponentId } });
  if (!opponent) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await getTeamRole(user.id, opponent.teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const reports = await prisma.scoutReport.findMany({
    where: { opponentId },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reports });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: opponentId } = await params;

  const opponent = await prisma.opponent.findUnique({ where: { id: opponentId } });
  if (!opponent) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, opponent.teamId, "MANAGE_SCOUTING"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const tendencies = typeof body?.tendencies === "string" ? body.tendencies.trim() : undefined;
  const tags: { label: string; notes?: string }[] = Array.isArray(body?.tags)
    ? body.tags.filter((t: unknown) => typeof t === "object" && t !== null && typeof (t as { label?: unknown }).label === "string")
    : [];
  if (!title || title.length > 160) {
    return NextResponse.json({ error: "Enter a title (up to 160 characters)." }, { status: 400 });
  }

  const report = await prisma.scoutReport.create({
    data: {
      opponentId,
      teamId: opponent.teamId,
      title,
      tendencies,
      createdById: user.id,
      tags: { create: tags.map((t) => ({ label: t.label.trim(), notes: t.notes?.trim() })) },
    },
    include: { tags: true },
  });

  return NextResponse.json({ report });
}
