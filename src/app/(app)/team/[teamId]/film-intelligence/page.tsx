import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getTeamRole, hasTeamPermission } from "@/lib/permissions";
import { GlowWaveText } from "@/components/GlowWaveText";
import { FilmIntelligenceManager } from "@/components/FilmIntelligenceManager";

export default async function FilmIntelligencePage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const [templates, opponents, reports, sent, received, canManageTemplates, canManageScouting, canGenerateReports, canShareFilm] =
    await Promise.all([
      prisma.filmAnalysisTemplate.findMany({ where: { teamId }, include: { categories: { orderBy: { order: "asc" } } }, orderBy: { createdAt: "asc" } }),
      prisma.opponent.findMany({ where: { teamId }, include: { _count: { select: { films: true, reports: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.filmReport.findMany({ where: { teamId }, orderBy: { createdAt: "desc" } }),
      prisma.filmShareGrant.findMany({ where: { fromTeamId: teamId, revokedAt: null }, include: { film: { select: { title: true } }, toTeam: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.filmShareGrant.findMany({ where: { toTeamId: teamId, revokedAt: null }, include: { film: { select: { title: true } }, fromTeam: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
      hasTeamPermission(user.id, teamId, "MANAGE_ANALYSIS_TEMPLATES"),
      hasTeamPermission(user.id, teamId, "MANAGE_SCOUTING"),
      hasTeamPermission(user.id, teamId, "GENERATE_REPORTS"),
      hasTeamPermission(user.id, teamId, "MANAGE_FILM_SHARING"),
    ]);

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{team.name}</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Film intelligence</GlowWaveText></h1>
      <FilmIntelligenceManager
        teamId={teamId}
        canManageTemplates={canManageTemplates}
        canManageScouting={canManageScouting}
        canGenerateReports={canGenerateReports}
        canShareFilm={canShareFilm}
        initialTemplates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          sport: t.sport,
          categories: t.categories.map((c) => ({ id: c.id, label: c.label })),
        }))}
        initialOpponents={opponents.map((o) => ({
          id: o.id,
          name: o.name,
          sport: o.sport,
          filmCount: o._count.films,
          reportCount: o._count.reports,
        }))}
        initialReports={reports.map((r) => ({ id: r.id, title: r.title, reportType: r.reportType, summary: r.summary, createdAt: r.createdAt.toISOString() }))}
        initialSharesSent={sent.map((g) => ({ id: g.id, filmTitle: g.film?.title ?? null, teamName: g.toTeam.name }))}
        initialSharesReceived={received.map((g) => ({ id: g.id, filmTitle: g.film?.title ?? null, teamName: g.fromTeam.name }))}
      />
    </div>
  );
}
