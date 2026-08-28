import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getTeamRole, canManageTrainingPrograms } from "@/lib/permissions";
import { getTeamProgram, toProgramDetailJson } from "@/lib/training-programs";
import { ProgramBuilder } from "@/components/ProgramBuilder";

export default async function TeamProgramDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; programId: string }>;
}) {
  const user = await requireUser();
  const { teamId, programId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const [program, canManage] = await Promise.all([
    getTeamProgram(teamId, programId),
    canManageTrainingPrograms(user.id, teamId),
  ]);
  if (!program) notFound();

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <Link href={`/team/${teamId}/programs`} className="mono text-text-3 mb-2 inline-block">
        ← {team.name} — Training programs
      </Link>
      <ProgramBuilder teamId={teamId} program={toProgramDetailJson(program)} canManage={canManage} />
    </div>
  );
}
