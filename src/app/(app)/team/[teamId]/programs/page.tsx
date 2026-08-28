import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getTeamRole, canManageTrainingPrograms } from "@/lib/permissions";
import { listTeamPrograms, toProgramSummaryJson } from "@/lib/training-programs";
import { GlowWaveText } from "@/components/GlowWaveText";
import { ProgramManager } from "@/components/ProgramManager";

export default async function TeamProgramsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const [programs, canManage] = await Promise.all([
    listTeamPrograms(teamId),
    canManageTrainingPrograms(user.id, teamId),
  ]);

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{team.name}</div>
      <h1 className="text-3xl font-semibold mb-8">
        <GlowWaveText intensity="strong">Training programs</GlowWaveText>
      </h1>
      <ProgramManager
        teamId={teamId}
        canManage={canManage}
        initialPrograms={programs.map((p) => ({ ...toProgramSummaryJson(p), createdAt: p.createdAt.toISOString() }))}
      />
    </div>
  );
}
