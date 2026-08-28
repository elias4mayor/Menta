import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { listVisibleExercises, toExerciseJson } from "@/lib/exercises";
import { canManageTeamExercises } from "@/lib/permissions";
import { GlowWaveText } from "@/components/GlowWaveText";
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
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Training</div>
      <h1 className="text-3xl font-semibold mb-8">
        <GlowWaveText intensity="strong">Exercise library</GlowWaveText>
      </h1>
      <ExerciseLibrary initialExercises={exercises.map(toExerciseJson)} manageableTeams={manageableTeams} />
    </div>
  );
}
