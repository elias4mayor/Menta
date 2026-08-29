import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getTeamRole, canRunLiveSession, canManageTrainingPrograms } from "@/lib/permissions";
import { getTeamTodaySessions, getSessionRoomView } from "@/lib/live-sessions";
import { listTeamPrograms, toProgramSummaryJson } from "@/lib/training-programs";
import { CoachCommandCenter } from "@/components/CoachCommandCenter";

export default async function TeamTrainPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const [canRun, canManagePrograms, todaySessions, programs, athleteCount] = await Promise.all([
    canRunLiveSession(user.id, teamId),
    canManageTrainingPrograms(user.id, teamId),
    getTeamTodaySessions(teamId, new Date()),
    listTeamPrograms(teamId),
    prisma.teamMembership.count({ where: { teamId, teamRole: "ATHLETE" } }),
  ]);

  const featured = todaySessions[0] ?? null;
  const room = featured ? await getSessionRoomView(teamId, featured.id) : null;

  return (
    <CoachCommandCenter
      teamId={teamId}
      teamName={team.name}
      canRunLiveSession={canRun}
      canManagePrograms={canManagePrograms}
      featuredSession={featured}
      otherSessionsToday={Math.max(todaySessions.length - 1, 0)}
      room={room}
      programs={programs.map(toProgramSummaryJson).filter((p) => p.status !== "ARCHIVED").slice(0, 4)}
      athleteCount={athleteCount}
    />
  );
}
