import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getTeamRole, canManageTrainingPrograms } from "@/lib/permissions";
import { getTeamProgram, toProgramDetailJson } from "@/lib/training-programs";
import { getProgramRoster, listProgramPrescriptions, toPrescriptionJson } from "@/lib/athlete-prescriptions";
import { PrescriptionGrid } from "@/components/PrescriptionGrid";

export default async function ProgramPrescriptionsPage({
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

  const [roster, prescriptions] = await Promise.all([
    getProgramRoster(teamId, program.positionGroupId),
    listProgramPrescriptions(programId),
  ]);

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <Link href={`/team/${teamId}/programs/${programId}`} className="mono text-text-3 mb-2 inline-block">
        ← {program.title}
      </Link>
      <PrescriptionGrid
        teamId={teamId}
        programId={programId}
        canManage={canManage}
        program={toProgramDetailJson(program)}
        roster={roster}
        initialPrescriptions={prescriptions.map((p) => ({ ...toPrescriptionJson(p), updatedAt: p.updatedAt.toISOString() }))}
      />
    </div>
  );
}
