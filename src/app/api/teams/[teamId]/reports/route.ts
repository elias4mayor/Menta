import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, hasTeamPermission } from "@/lib/permissions";

const REPORT_TYPES = ["TEAM", "ATHLETE", "POSITION", "GAME", "SEASON", "OPPONENT"];

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const reports = await prisma.filmReport.findMany({ where: { teamId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ reports });
}

/**
 * Generates a report as a point-in-time JSON snapshot from real
 * FilmAnalysisEntry/FilmTagInstance data already in the database — never
 * fabricated or AI-hallucinated. A team/position report with no analysis
 * entries yet produces an honestly empty summary, not invented numbers.
 */
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "GENERATE_REPORTS"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const reportType = typeof body?.reportType === "string" ? body.reportType : "TEAM";
  const positionGroupId = typeof body?.positionGroupId === "string" ? body.positionGroupId : undefined;
  if (!title || title.length > 160) {
    return NextResponse.json({ error: "Enter a title (up to 160 characters)." }, { status: 400 });
  }
  if (!REPORT_TYPES.includes(reportType)) {
    return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }

  const entries = await prisma.filmAnalysisEntry.findMany({
    where: { template: { teamId }, ...(positionGroupId ? { film: { positionGroupId } } : {}) },
    include: { category: true },
  });
  const tagInstances = await prisma.filmTagInstance.findMany({
    where: { film: { teamId, ...(positionGroupId ? { positionGroupId } : {}) } },
    include: { tagDefinition: true },
  });

  const byCategory: Record<string, { count: number; total: number }> = {};
  for (const e of entries) {
    if (e.score === null) continue;
    const key = e.category.label;
    byCategory[key] ??= { count: 0, total: 0 };
    byCategory[key].count += 1;
    byCategory[key].total += e.score;
  }
  const averageByCategory = Object.fromEntries(
    Object.entries(byCategory).map(([label, { count, total }]) => [label, Math.round((total / count) * 100) / 100])
  );

  const tagCounts: Record<string, number> = {};
  for (const t of tagInstances) {
    tagCounts[t.tagDefinition.label] = (tagCounts[t.tagDefinition.label] ?? 0) + 1;
  }

  const summary = JSON.stringify({
    generatedAt: new Date().toISOString(),
    analysisEntryCount: entries.length,
    averageByCategory,
    tagCounts,
  });

  const report = await prisma.filmReport.create({
    data: { teamId, positionGroupId, title, reportType, generatedById: user.id, summary },
  });

  return NextResponse.json({ report });
}
