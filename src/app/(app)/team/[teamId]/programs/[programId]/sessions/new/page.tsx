import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canRunLiveSession } from "@/lib/permissions";
import { getTeamProgram } from "@/lib/training-programs";
import { getProgramRoster } from "@/lib/athlete-prescriptions";
import { CreateLiveSessionForm } from "@/components/CreateLiveSessionForm";

export default async function NewLiveSessionPage({ params }: { params: Promise<{ teamId: string; programId: string }> }) {
  const user = await requireUser();
  const { teamId, programId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await canRunLiveSession(user.id, teamId))) notFound();

  const program = await getTeamProgram(teamId, programId);
  if (!program) notFound();

  const roster = await getProgramRoster(teamId, program.positionGroupId);

  return (
    <div className="max-w-lg mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{program.title}</div>
      <h1 className="text-2xl font-semibold mb-6">Start a live session</h1>
      <CreateLiveSessionForm teamId={teamId} programId={programId} defaultTitle={program.title} roster={roster} />
    </div>
  );
}
