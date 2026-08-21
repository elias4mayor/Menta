import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { TrainingView } from "@/components/TrainingView";
import { GlowWaveText } from "@/components/GlowWaveText";

export default async function TrainPage() {
  const user = await requireUser();

  const [workouts, manageableTeams, profile] = await Promise.all([
    prisma.workout.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { team: { memberships: { some: { userId: user.id } } } },
        ],
      },
      include: {
        team: true,
        completions: { where: { userId: user.id }, orderBy: { completedAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMembership.findMany({
      where: { userId: user.id, teamRole: { in: ["COACH", "ADMIN"] } },
      include: { team: true },
    }),
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mono text-text-3 mb-2">Training</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Workout library</GlowWaveText></h1>
      <TrainingView
        initialWorkouts={workouts.map((w) => ({
          id: w.id,
          title: w.title,
          category: w.category,
          description: w.description,
          exercises: w.exercises ? JSON.parse(w.exercises) : [],
          teamName: w.team?.name ?? null,
          isPlanWorkout: w.planTag != null,
          yourCompletions: w.completions.length,
          lastCompletedAt: w.completions[0]?.completedAt.toISOString() ?? null,
        }))}
        manageableTeams={manageableTeams.map((m) => ({ id: m.team.id, name: m.team.name }))}
        defaultSport={profile?.sport ?? null}
        defaultPosition={profile?.position ?? null}
        defaultTrainingDaysPerWeek={profile?.trainingDaysPerWeek ?? null}
      />
    </div>
  );
}
