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

  const templates = await prisma.filmAnalysisTemplate.findMany({
    where: { teamId },
    include: { categories: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_ANALYSIS_TEMPLATES"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const sport = typeof body?.sport === "string" ? body.sport.trim() : undefined;
  const categories: string[] = Array.isArray(body?.categories)
    ? body.categories.filter((c: unknown) => typeof c === "string" && c.trim()).map((c: string) => c.trim())
    : [];
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Enter a template name (up to 120 characters)." }, { status: 400 });
  }
  if (categories.length === 0) {
    return NextResponse.json({ error: "Add at least one grading category." }, { status: 400 });
  }

  const template = await prisma.filmAnalysisTemplate.create({
    data: {
      teamId,
      sport,
      name,
      createdById: user.id,
      categories: { create: categories.map((label, order) => ({ label, order })) },
    },
    include: { categories: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ template });
}
