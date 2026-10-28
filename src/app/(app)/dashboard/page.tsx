import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getAiHealth } from "@/lib/ai";
import { getMyDay } from "@/lib/my-day";
import { GoalsPanel } from "@/components/GoalsPanel";
import { HomeOverview } from "@/components/HomeOverview";
import { TodaysPriorities } from "@/components/TodaysPriorities";
import { GlowWaveText } from "@/components/GlowWaveText";
import { PlanCard } from "@/components/PlanCard";
import { DailyBrief } from "@/components/DailyBrief";
import { TodaysSessionCard } from "@/components/TodaysSessionCard";
import { demandsFor } from "@/lib/sports";
import { ONBOARDING_PLAN_TAG } from "@/lib/generate-plan";
import { CoachDashboard } from "@/components/CoachDashboard";
import { TrainerDashboard } from "@/components/TrainerDashboard";
import { ParentDashboard } from "@/components/ParentDashboard";
import { DoctorDashboard } from "@/components/DoctorDashboard";
import type { SessionUser } from "@/lib/session";

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

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "COACH") return <CoachDashboard user={user} />;
  if (user.role === "TRAINER") return <TrainerDashboard user={user} />;
  if (user.role === "PARENT") return <ParentDashboard user={user} />;
  if (user.role === "DOCTOR") return <DoctorDashboard user={user} />;

  return <AthleteDashboard user={user} />;
}

async function AthleteDashboard({ user }: { user: SessionUser }) {
  const now = new Date();

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    profile,
    teamMemberships,
    myDay,
    goals,
    notifications,
    aiHealth,
    completionsThisWeek,
    latestPerformanceEntry,
    planWorkouts,
  ] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
    prisma.teamMembership.findMany({
      where: { userId: user.id },
      include: { team: true },
    }),
    getMyDay(user.id, now),
    prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    getAiHealth(),
    prisma.workoutCompletion.count({
      where: { userId: user.id, completedAt: { gte: weekAgo } },
    }),
    prisma.performanceEntry.findFirst({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.workout.findMany({
      where: { createdById: user.id, planTag: ONBOARDING_PLAN_TAG },
      include: {
        completions: {
          where: { userId: user.id },
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const aiEnvVar =
    aiProvider === "anthropic"
      ? "ANTHROPIC_API_KEY"
      : aiProvider === "openai"
        ? "OPENAI_API_KEY"
        : "GEMINI_API_KEY";

  const activeGoalsCount = goals.filter((g) => g.status === "ACTIVE").length;
  const todayEnd = endOfDay(now);
  const priorityGoals = goals
    .filter(
      (g) => g.status === "ACTIVE" && g.targetDate && g.targetDate <= todayEnd,
    )
    .slice(0, 4)
    .map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      overdue: Boolean(g.targetDate && g.targetDate < startOfDay(now)),
    }));

  const demands = profile?.sport
    ? demandsFor(profile.sport, profile.position)
    : null;

  // Everything below derives from the shared getMyDay() layer (src/lib/my-day.ts)
  // instead of re-deriving from raw Calendar/Assignment/FilmAssignmentTarget rows —
  // the same aggregation now also powers the AI's daily-brief context.
  const todaysEvents = myDay.today.filter((i) => i.kind === "Event");
  const todayItemCount = myDay.today.length;
  const heroHeadline =
    todaysEvents.length > 0
      ? todaysEvents[0].title
      : todayItemCount > 0
        ? `${todayItemCount} thing${todayItemCount === 1 ? "" : "s"} due today`
        : profile?.sport
          ? `${profile.sport} — nothing scheduled today`
          : "Nothing scheduled today";
  // UPCOMING — one merged, chronological timeline instead of three separate
  // lists, combining only real calendar/academic/film-assignment rows that
  // are due after today.
  const upcoming = myDay.upcoming.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto">
      {/* TODAY'S TRAINING — the single most time-sensitive thing on this
          page when it exists: a coach-run MENTA LIVE session the athlete
          is actually assigned to. Placed above the hero panel on purpose
          so it's the first thing seen, not one more card in the grid
          below. Renders nothing heavy when there's no session today. */}
      <TodaysSessionCard session={myDay.todaySession} />

      <HomeOverview
        name={user.name}
        today={now.toISOString()}
        headline={myDay.todaySession?.title ?? heroHeadline}
        detail={
          myDay.todaySession?.currentExerciseName ??
          (todayItemCount > 0
            ? `${todayItemCount} items on your agenda. Everything you need, right here.`
            : "Your next rep, your next goal, your next step. Make today count.")
        }
        primaryHref="/train"
        primaryLabel={
          myDay.todaySession ? "Open today’s training" : "Start a workout"
        }
        trainingCount={completionsThisWeek}
        academicCount={
          myDay.today.filter((item) => item.kind === "Academic").length
        }
        teamHref="/team"
        stats={[
          {
            label: "Workouts this week",
            value: completionsThisWeek,
            href: "/train",
          },
          {
            label: "Active goals",
            value: activeGoalsCount,
            href: "/dashboard#goals",
          },
          {
            label: latestPerformanceEntry?.statName ?? "Latest stat",
            value: latestPerformanceEntry
              ? `${latestPerformanceEntry.value}${latestPerformanceEntry.unit ? ` ${latestPerformanceEntry.unit}` : ""}`
              : "—",
            href: "/performance",
          },
        ]}
        timeline={[...myDay.today, ...myDay.upcoming].map((item) => ({
          id: `${item.kind}-${item.id}`,
          title: item.title,
          at: item.at.toISOString(),
          href: item.href,
          kind: item.kind,
        }))}
      />
      <DailyBrief />

      <div className="cockpit-grid mt-8">
        <div className="space-y-8 dash-in dash-in-4">
          <div>
            <div className="mono text-text-3 mb-3">Progress</div>
            <div className="space-y-4">
              <PlanCard
                sport={profile?.sport ?? null}
                trainingDaysPerWeek={profile?.trainingDaysPerWeek ?? null}
                developmentAreas={demands?.developmentAreas ?? []}
                trainingNote={demands?.trainingNote ?? ""}
                workouts={planWorkouts.map((w) => ({
                  id: w.id,
                  title: w.title,
                  category: w.category,
                  description: w.description,
                  exercises: w.exercises ? JSON.parse(w.exercises) : [],
                  yourCompletions: w.completions.length,
                  lastCompletedAt:
                    w.completions[0]?.completedAt.toISOString() ?? null,
                }))}
              />
              <div className="card p-5">
                <TodaysPriorities goals={priorityGoals} />
              </div>
              <div className="card p-5" id="goals">
                <GoalsPanel
                  initial={goals.map((g) => ({
                    id: g.id,
                    title: g.title,
                    category: g.category,
                    actionPlan: g.actionPlan,
                    progress: g.progress,
                    status: g.status,
                    targetDate: g.targetDate
                      ? g.targetDate.toISOString()
                      : null,
                  }))}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-text-3">Upcoming</div>
              <Link
                href="/calendar"
                className="text-xs text-text-2 hover:text-text-1"
              >
                Calendar →
              </Link>
            </div>
            <div className="card p-5">
              {upcoming.length === 0 ? (
                <p className="text-text-2 text-sm">
                  Nothing else on the horizon yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((item) => (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="mono text-text-3 w-20 shrink-0">
                        {item.at.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="flex-1 truncate">{item.title}</span>
                      <span className="badge shrink-0">{item.kind}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 dash-in dash-in-5">
          <div className="context-card">
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-text-3">MENTA AI</div>
              {aiHealth === "connected" ? (
                <span className="badge badge-live">Connected</span>
              ) : aiHealth === "unavailable" ? (
                <span className="badge badge-warn">Needs attention</span>
              ) : (
                <span className="badge badge-demo">Not connected</span>
              )}
            </div>
            <p className="text-text-2 text-sm mb-4">
              {aiHealth === "connected"
                ? "Ask about training, recovery, recruiting, or academics."
                : aiHealth === "unavailable"
                  ? "MENTA's AI service needs attention right now. Try again shortly."
                  : `Set ${aiEnvVar} to turn on the live assistant.`}
            </p>
            <Link
              href="/ai-coach"
              className="btn-secondary w-full justify-center"
            >
              <GlowWaveText intensity="subtle">Open MENTA AI</GlowWaveText>
            </Link>
          </div>

          <div className="context-card">
            <div className="mono text-text-3 mb-3">You</div>
            {profile ? (
              <>
                <p className="text-sm mb-1">
                  {profile.sport || "Sport not set"}
                </p>
                <p className="text-text-2 text-sm mb-3">
                  {profile.schoolName || "School not set"}
                </p>
              </>
            ) : (
              <p className="text-text-2 text-sm mb-3">
                Finish onboarding to set up your profile.
              </p>
            )}
            <Link
              href="/profile"
              className="text-xs text-text-2 hover:text-text-1"
            >
              View profile →
            </Link>
          </div>

          <div className="context-card">
            <div className="mono text-text-3 mb-3">Team</div>
            {teamMemberships.length === 0 ? (
              <>
                <p className="text-text-2 text-sm mb-3">
                  You&rsquo;re not on a team yet.
                </p>
                <Link
                  href="/team"
                  className="text-xs text-text-2 hover:text-text-1"
                >
                  Create or join a team →
                </Link>
              </>
            ) : (
              <ul className="space-y-2 text-sm">
                {teamMemberships.map((m) => (
                  <li key={m.id}>{m.team.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="context-card">
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-text-3">Recent activity</div>
              <Link
                href="/notifications"
                className="text-xs text-text-2 hover:text-text-1"
              >
                View all →
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-text-2 text-sm">Nothing yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between">
                    <span className={n.readAt ? "text-text-2" : ""}>
                      {n.title}
                    </span>
                    <span className="mono text-text-3">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
