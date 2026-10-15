import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { listVisibleExercises, toExerciseJson } from "@/lib/exercises";
import { canManageTeamExercises } from "@/lib/permissions";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ExerciseLibrary } from "@/components/ExerciseLibrary";

export default async function ExerciseLibraryPage() {
  const user = await requireUser();

  const [exercises, memberships] = await Promise.all([
    listVisibleExercises(user.id),
    prisma.teamMembership.findMany({ where: { userId: user.id }, include: { team: { select: { id: true, name: true } } } }),
  ]);

  const uniqueTeams = Array.from(new Map(memberships.map((m) => [m.team.id, m.team])).values());
  const manageableChecks = await Promise.all(uniqueTeams.map((t) => canManageTeamExercises(user.id, t.id)));
  const manageableTeams = uniqueTeams.filter((_, i) => manageableChecks[i]);

  return (
    <div className="workspace-page dash-in dash-in-1">
      <WorkspaceHeader section="Training" title="Exercise library" description="Find your next movement. Explore exercises and build better sessions." icon="train" />
      <ExerciseLibrary initialExercises={exercises.map(toExerciseJson)} manageableTeams={manageableTeams} />
    </div>
  );
}
