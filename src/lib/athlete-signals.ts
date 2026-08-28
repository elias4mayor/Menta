import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Deterministic, pre-computed observations about an athlete's own data —
 * never something the AI is asked to infer. Each signal is a plain
 * TypeScript comparison over real fields already on Goal/AthleteProfile/
 * WorkoutCompletion; the AI's job (in buildDailyBriefContext, ai.ts) is to
 * narrate these clearly, not to calculate them. Kept separate from
 * my-day.ts on purpose — that file aggregates dated schedule items
 * (calendar/academic/film), this one produces flag-shaped observations
 * that aren't tied to a specific due date.
 */
export type AthleteSignal = {
  kind: "GoalBehindSchedule" | "TrainingBehindPace" | "StaleFilmAssignment";
  message: string;
};

const STALE_FILM_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Fires for an ACTIVE goal with a target date that's either already passed
 * (and still incomplete) or arriving within a week with progress under
 * half — both plain, explainable comparisons, not a projected trend line.
 */
async function getGoalSignals(userId: string, now: Date): Promise<AthleteSignal[]> {
  const activeGoals = await prisma.goal.findMany({
    where: { userId, status: "ACTIVE", targetDate: { not: null } },
  });

  const sevenDaysOut = new Date(now.getTime() + SEVEN_DAYS_MS);
  const signals: AthleteSignal[] = [];

  for (const goal of activeGoals) {
    const targetDate = goal.targetDate;
    if (!targetDate) continue;

    const overdue = targetDate < now && goal.progress < 100;
    const dueSoonAndFarBehind = !overdue && targetDate <= sevenDaysOut && goal.progress < 50;
    if (!overdue && !dueSoonAndFarBehind) continue;

    signals.push({
      kind: "GoalBehindSchedule",
      message: overdue
        ? `Goal "${goal.title}" was due ${targetDate.toLocaleDateString()} and is only ${goal.progress}% complete.`
        : `Goal "${goal.title}" is due ${targetDate.toLocaleDateString()} and is only ${goal.progress}% complete.`,
    });
  }

  return signals.slice(0, 3);
}

/**
 * Fires when logged workouts in the trailing 7 days (the same rolling
 * window and query the dashboard's own "Workouts this week" stat already
 * uses) fall short of the athlete's own stated trainingDaysPerWeek. Gives
 * a 2-day grace period after onboarding so a brand-new athlete's first day
 * doesn't look "behind" against a week-old window that hasn't had a
 * chance to fill in yet.
 */
async function getTrainingSignal(userId: string, now: Date): Promise<AthleteSignal | null> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId },
    select: { trainingDaysPerWeek: true, onboardingCompletedAt: true },
  });
  if (!profile?.trainingDaysPerWeek || !profile.onboardingCompletedAt) return null;

  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  if (profile.onboardingCompletedAt > twoDaysAgo) return null;

  const weekAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const completionsThisWeek = await prisma.workoutCompletion.count({
    where: { userId, completedAt: { gte: weekAgo, lte: now } },
  });

  if (completionsThisWeek >= profile.trainingDaysPerWeek) return null;

  return {
    kind: "TrainingBehindPace",
    message: `You've completed ${completionsThisWeek} of your planned ${profile.trainingDaysPerWeek} workouts in the last 7 days.`,
  };
}

/**
 * Fires for a film review assignment that's still sitting at ASSIGNED —
 * never even opened — 3+ days after it was assigned, independent of its
 * due date. A different signal than "due today/soon": an assignment due
 * next week that's already been sitting untouched for 3 days is worth
 * surfacing even though it's nowhere near late.
 */
async function getStaleFilmSignals(userId: string, now: Date): Promise<AthleteSignal[]> {
  const staleThreshold = new Date(now.getTime() - STALE_FILM_THRESHOLD_MS);

  const staleTargets = await prisma.filmAssignmentTarget.findMany({
    where: { userId, status: "ASSIGNED", createdAt: { lte: staleThreshold } },
    include: { assignment: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  return staleTargets.map((t) => {
    const daysStale = Math.floor((now.getTime() - t.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    return {
      kind: "StaleFilmAssignment" as const,
      message: `Film assignment "${t.assignment.title}" has been sitting unopened for ${daysStale} days.`,
    };
  });
}

export async function getAthleteSignals(userId: string, now: Date = new Date()): Promise<AthleteSignal[]> {
  const [goalSignals, trainingSignal, staleFilmSignals] = await Promise.all([
    getGoalSignals(userId, now),
    getTrainingSignal(userId, now),
    getStaleFilmSignals(userId, now),
  ]);
  return [...goalSignals, ...(trainingSignal ? [trainingSignal] : []), ...staleFilmSignals];
}
