import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getTeamRole, canRunLiveSession } from "@/lib/permissions";
import { getSessionRoomView } from "@/lib/live-sessions";
import { getTeamProgram, toProgramDetailJson } from "@/lib/training-programs";
import { LiveCoachView } from "@/components/LiveCoachView";

export default async function LiveSessionCoachPage({ params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await requireUser();
  const { teamId, id } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const [room, canManage] = await Promise.all([getSessionRoomView(teamId, id), canRunLiveSession(user.id, teamId)]);
  if (!room) notFound();

  const sessionRow = await prisma.trainingSession.findUnique({ where: { id }, select: { programId: true } });
  const fullProgram = sessionRow?.programId ? await getTeamProgram(teamId, sessionRow.programId) : null;

  return (
    <LiveCoachView
      teamId={teamId}
      sessionId={id}
      canManage={canManage}
      initialRoom={JSON.parse(JSON.stringify(room))}
      program={fullProgram ? toProgramDetailJson(fullProgram) : null}
    />
  );
}
