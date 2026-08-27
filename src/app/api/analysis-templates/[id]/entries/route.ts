import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: templateId } = await params;

  const template = await prisma.filmAnalysisTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, template.teamId, "GRADE_FILM"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const entries = await prisma.filmAnalysisEntry.findMany({
    where: { templateId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: templateId } = await params;

  const template = await prisma.filmAnalysisTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, template.teamId, "GRADE_FILM"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : null;
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : null;
  const filmId = typeof body?.filmId === "string" ? body.filmId : undefined;
  const clipId = typeof body?.clipId === "string" ? body.clipId : undefined;
  const score = typeof body?.score === "number" ? body.score : null;
  const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;
  if (!categoryId) return NextResponse.json({ error: "Choose a category." }, { status: 400 });

  const category = await prisma.filmAnalysisCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.templateId !== templateId) return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  const entry = await prisma.filmAnalysisEntry.create({
    data: { templateId, categoryId, filmId, clipId, athleteId, score, notes, gradedById: user.id },
  });

  return NextResponse.json({ entry });
}
