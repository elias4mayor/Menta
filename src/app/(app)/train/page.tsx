import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { TrainingHub, type TeamSessionInfo } from "@/components/TrainingHub";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export default async function TrainPage() {
  const user = await requireUser();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [memberships, workoutCount, completionsThisWeek, latestStat] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { userId: user.id },
      include: { team: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.workout.count({
      where: {
        OR: [
          { createdById: user.id },
          { assignedToId: user.id },
          { AND: [{ team: { memberships: { some: { userId: user.id } } } }, { isTemplate: false }] },
        ],
      },
    }),
    prisma.workoutCompletion.count({ where: { userId: user.id, completedAt: { gte: weekAgo } } }),
    prisma.performanceEntry.findFirst({ where: { userId: user.id }, orderBy: { recordedAt: "desc" } }),
  ]);

  const teamIds = memberships.map((m) => m.teamId);
  const isCoach = memberships.some((m) => m.teamRole === "COACH" || m.teamRole === "ADMIN");
  const primaryManagedTeam = memberships.find((m) => m.teamRole === "COACH" || m.teamRole === "ADMIN");

  let teamSession: TeamSessionInfo | null = null;
  if (teamIds.length > 0) {
    const sessions = await prisma.trainingSession.findMany({
      where: {
        teamId: { in: teamIds },
        OR: [
          { status: { in: ["LIVE", "PAUSED"] } },
          { status: "SCHEDULED", scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        ],
      },
      include: { team: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      take: 1,
    });
    const s = sessions[0];
    if (s) {
      teamSession = {
        teamId: s.teamId,
        teamName: s.team.name,
        sessionId: s.id,
        title: s.title,
        status: s.status === "LIVE" || s.status === "PAUSED" ? "LIVE" : "TODAY",
      };
    }
  }

  return (
    <TrainingHub
      isCoach={isCoach}
      workoutsThisWeek={completionsThisWeek}
      totalWorkouts={workoutCount}
      latestStat={
        latestStat
          ? { statName: latestStat.statName, value: latestStat.value, unit: latestStat.unit }
          : null
      }
      teamSession={teamSession}
      primaryTeamId={primaryManagedTeam?.teamId ?? null}
    />
  );
}
