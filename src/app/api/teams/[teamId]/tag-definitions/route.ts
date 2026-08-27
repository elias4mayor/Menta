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

  const definitions = await prisma.filmTagDefinition.findMany({ where: { teamId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ definitions });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_FILM_TAGS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const sport = typeof body?.sport === "string" ? body.sport.trim() : undefined;
  const category = typeof body?.category === "string" ? body.category.trim() : undefined;
  if (!label || label.length > 60) {
    return NextResponse.json({ error: "Enter a tag label (up to 60 characters)." }, { status: 400 });
  }

  const definition = await prisma.filmTagDefinition.create({
    data: { teamId, label, sport, category, createdById: user.id },
  });
  return NextResponse.json({ definition });
}
