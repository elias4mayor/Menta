import "server-only";
import type { FilmAnalysisReport } from "@/lib/film-analysis-report";
import { canViewFilm, isTeamFilmStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function recordFilmAnalysisResult(jobId: string, report: FilmAnalysisReport) {
  const job = await prisma.filmAnalysisJob.findUnique({
    where: { id: jobId },
    include: {
      film: true,
      requestedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!job || job.film.status === "ARCHIVED" || !(await canViewFilm(job.requestedBy, job.film))) return "not-found";
  if (job.requestedById !== job.film.uploadedById && (
    !job.film.teamId || !(await isTeamFilmStaff(job.requestedById, job.film.teamId))
  )) return "not-found";

  const allowedCues = new Set(job.allowedCueIds);
  if (report.events.some((event) =>
    event.startMs < job.startMs || event.endMs > job.endMs ||
    (event.coachingCueId !== null && !allowedCues.has(event.coachingCueId))
  )) return "invalid-report";

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.filmAnalysisJob.updateMany({
      where: { id: jobId, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (!claimed.count) return "duplicate";

    await tx.filmAnalysisReport.create({ data: { jobId, payload: report } });
    await tx.notification.create({
      data: {
        userId: job.requestedById,
        type: "TRAINING",
        title: "Film analysis draft is ready",
        link: `/film/${encodeURIComponent(job.filmId)}?t=${job.startMs / 1000}`,
      },
    });
    return "saved";
  });
}
