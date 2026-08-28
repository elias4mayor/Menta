import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isTeamFilmStaff } from "@/lib/permissions";
import { GlowWaveText } from "@/components/GlowWaveText";
import { ReviewRequestsInbox } from "@/components/ReviewRequestsInbox";

export default async function TeamReviewRequestsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await isTeamFilmStaff(user.id, teamId))) notFound();

  const requests = await prisma.filmReviewRequest.findMany({
    where: { film: { teamId }, OR: [{ coachId: null }, { coachId: user.id }] },
    include: { film: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const athleteIds = Array.from(new Set(requests.map((r) => r.athleteId)));
  const athletes = await prisma.user.findMany({ where: { id: { in: athleteIds } }, select: { id: true, name: true } });
  const nameById = new Map(athletes.map((a) => [a.id, a.name]));

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{team.name}</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Film questions</GlowWaveText></h1>
      <ReviewRequestsInbox
        initialRequests={requests.map((r) => ({
          id: r.id,
          filmId: r.filmId,
          filmTitle: r.film.title,
          athleteName: nameById.get(r.athleteId) ?? "Unknown",
          timestampSec: r.timestampSec,
          question: r.question,
          status: r.status,
          response: r.response,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
