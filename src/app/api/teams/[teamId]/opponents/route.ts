import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, hasTeamPermission } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const opponents = await prisma.opponent.findMany({
    where: { teamId },
    include: { _count: { select: { films: true, reports: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    opponents: opponents.map((o) => ({
      id: o.id,
      name: o.name,
      sport: o.sport,
      notes: o.notes,
      filmCount: o._count.films,
      reportCount: o._count.reports,
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_SCOUTING"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const sport = typeof body?.sport === "string" ? body.sport.trim() : undefined;
  const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Enter an opponent name (up to 120 characters)." }, { status: 400 });
  }

  const opponent = await prisma.opponent.create({ data: { teamId, name, sport, notes } });
  return NextResponse.json({ opponent });
}
