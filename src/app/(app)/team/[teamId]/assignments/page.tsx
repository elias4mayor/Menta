import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { hasTeamPermission } from "@/lib/permissions";
import { GlowWaveText } from "@/components/GlowWaveText";
import { TeamAssignmentsManager } from "@/components/TeamAssignmentsManager";

export default async function TeamAssignmentsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await hasTeamPermission(user.id, teamId, "CREATE_ASSIGNMENT"))) notFound();

  const [assignments, groups] = await Promise.all([
    prisma.filmAssignment.findMany({
      where: { teamId },
      include: {
        film: { select: { title: true } },
        playlist: { select: { title: true } },
        clip: { select: { label: true } },
        positionGroup: { select: { name: true } },
        targets: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.positionGroup.findMany({ where: { teamId }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{team.name}</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Film assignments</GlowWaveText></h1>
      <TeamAssignmentsManager
        teamId={teamId}
        groups={groups}
        initialAssignments={assignments.map((a) => ({
          id: a.id,
          title: a.title,
          instructions: a.instructions,
          dueAt: a.dueAt ? a.dueAt.toISOString() : null,
          positionGroupName: a.positionGroup?.name ?? null,
          filmTitle: a.film?.title ?? null,
          playlistTitle: a.playlist?.title ?? null,
          clipLabel: a.clip?.label ?? null,
          targetCount: a.targets.length,
          completedCount: a.targets.filter((t) => t.status === "COMPLETED").length,
        }))}
      />
    </div>
  );
}
