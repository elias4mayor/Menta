import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/ai";
import { getMyDay } from "@/lib/my-day";
import { GoalsPanel } from "@/components/GoalsPanel";
import { CountUpValue } from "@/components/CountUpValue";
import { TodaysPriorities } from "@/components/TodaysPriorities";
import { GlowWaveText } from "@/components/GlowWaveText";
import { PlanCard } from "@/components/PlanCard";
import { DailyBrief } from "@/components/DailyBrief";
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
    aiConfigured,
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
    Promise.resolve(isAiConfigured()),
    prisma.workoutCompletion.count({
      where: { userId: user.id, completedAt: { gte: weekAgo } },
    }),
    prisma.performanceEntry.findFirst({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.workout.findMany({
      where: { createdById: user.id, planTag: ONBOARDING_PLAN_TAG },
      include: { completions: { where: { userId: user.id }, orderBy: { completedAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const aiEnvVar = aiProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";

  const activeGoalsCount = goals.filter((g) => g.status === "ACTIVE").length;
  const todayEnd = endOfDay(now);
  const priorityGoals = goals
    .filter((g) => g.status === "ACTIVE" && g.targetDate && g.targetDate <= todayEnd)
    .slice(0, 4)
    .map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      overdue: Boolean(g.targetDate && g.targetDate < startOfDay(now)),
    }));

  const demands = profile?.sport ? demandsFor(profile.sport, profile.position) : null;

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
  // Anything today beyond the single headline item above — shown as a
  // compact secondary list inside the hero rather than a separate section,
  // so "what's happening today" stays in one place. Chronological order
  // (matches the rest of the page) rather than grouped-by-type.
  const moreToday = myDay.today
    .filter((item) => item.id !== todaysEvents[0]?.id)
    .slice(0, 3)
    .map((item) => ({ id: item.id, label: item.title }));

  // UPCOMING — one merged, chronological timeline instead of three separate
  // lists, combining only real calendar/academic/film-assignment rows that
  // are due after today.
  const upcoming = myDay.upcoming.slice(0, 6);
  const upcomingCalendarEvents = myDay.upcoming.filter((i) => i.kind === "Event");
  const nextEvent = upcomingCalendarEvents[0];

  return (
    <div className="max-w-6xl mx-auto">
      {/* NOW + STATUS — the hero panel answers "what should I care about right
          now", using only real queried fields (no fabricated readiness/
          mindset composite scores). NEXT + ACTION live in the context
          column beside it, so the two most time-sensitive things are
          visible without scrolling. */}
      <div className="cockpit-grid mb-8">
        <div className="hero-panel dash-in-primary dash-in-3">
          <div className="flex items-center justify-between mb-2">
            <div className="mono text-text-3">Today</div>
            <div className="mono text-text-3" style={{ opacity: 0.75 }}>
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-1 line-clamp-2">{heroHeadline}</h2>
          <p className="text-text-2 text-sm mb-4">
            {todaysEvents.length > 0
              ? todaysEvents[0].at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              : todayItemCount > 0
                ? "Nothing on the calendar, but a few things need attention."
                : "A good day to log a workout or check in on your goals."}
          </p>
          {moreToday.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-6">
              {moreToday.map((item) => (
                <li key={item.id} className="badge">
                  {item.label}
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Workouts this week", value: completionsThisWeek, href: "/train" },
              {
                label: latestPerformanceEntry?.statName ?? "Latest stat",
                value: latestPerformanceEntry
                  ? `${latestPerformanceEntry.value}${latestPerformanceEntry.unit ? ` ${latestPerformanceEntry.unit}` : ""}`
                  : "—",
                href: "/performance",
              },
              { label: "Active goals", value: activeGoalsCount, href: "/dashboard#goals" },
              { label: "Teams", value: teamMemberships.length, href: "/team" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="block">
                <div className="cockpit-stat-value mb-1">
                  {typeof stat.value === "number" ? <CountUpValue value={stat.value} /> : stat.value}
                </div>
                <div className="mono text-text-3">{stat.label}</div>
              </Link>
            ))}
          </div>

          <DailyBrief />
        </div>

        <div className="space-y-4 dash-in dash-in-4">
          <div className="context-card">
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-text-3">Next up</div>
              <Link href="/calendar" className="text-xs text-text-2 hover:text-text-1">
                Calendar →
              </Link>
            </div>
            {nextEvent ? (
              <ul className="space-y-3">
                {upcomingCalendarEvents.slice(0, 3).map((event) => (
                  <li key={event.id} className="flex items-center gap-3 text-sm">
                    <span className="mono text-text-3 w-20 shrink-0">
                      {event.at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span>{event.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-2 text-sm">Nothing on the calendar yet.</p>
            )}
          </div>

          <div className="context-card">
            <div className="mono text-text-3 mb-3">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Link href="/train" className="btn-secondary justify-start">Start a workout</Link>
              <Link href="/film" className="btn-secondary justify-start">Upload film</Link>
              <Link href="/ai-coach" className="btn-secondary justify-start">
                <GlowWaveText intensity="subtle">Ask MENTA AI</GlowWaveText>
              </Link>
            </div>
          </div>
        </div>
      </div>

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
                  lastCompletedAt: w.completions[0]?.completedAt.toISOString() ?? null,
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
                    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
                  }))}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-text-3">Upcoming</div>
              <Link href="/calendar" className="text-xs text-text-2 hover:text-text-1">
                Calendar →
              </Link>
            </div>
            <div className="card p-5">
              {upcoming.length === 0 ? (
                <p className="text-text-2 text-sm">Nothing else on the horizon yet.</p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 text-sm">
                      <span className="mono text-text-3 w-20 shrink-0">
                        {item.at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
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
              {aiConfigured ? (
                <span className="badge badge-live">Connected</span>
              ) : (
                <span className="badge badge-demo">Not connected</span>
              )}
            </div>
            <p className="text-text-2 text-sm mb-4">
              {aiConfigured
                ? "Ask about training, recovery, recruiting, or academics."
                : `Set ${aiEnvVar} to turn on the live assistant.`}
            </p>
            <Link href="/ai-coach" className="btn-secondary w-full justify-center">
              <GlowWaveText intensity="subtle">Open MENTA AI</GlowWaveText>
            </Link>
          </div>

          <div className="context-card">
            <div className="mono text-text-3 mb-3">You</div>
            {profile ? (
              <>
                <p className="text-sm mb-1">{profile.sport || "Sport not set"}</p>
                <p className="text-text-2 text-sm mb-3">{profile.schoolName || "School not set"}</p>
              </>
            ) : (
              <p className="text-text-2 text-sm mb-3">Finish onboarding to set up your profile.</p>
            )}
            <Link href="/profile" className="text-xs text-text-2 hover:text-text-1">
              View profile →
            </Link>
          </div>

          <div className="context-card">
            <div className="mono text-text-3 mb-3">Team</div>
            {teamMemberships.length === 0 ? (
              <>
                <p className="text-text-2 text-sm mb-3">You&rsquo;re not on a team yet.</p>
                <Link href="/team" className="text-xs text-text-2 hover:text-text-1">
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
              <Link href="/notifications" className="text-xs text-text-2 hover:text-text-1">
                View all →
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-text-2 text-sm">Nothing yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between">
                    <span className={n.readAt ? "text-text-2" : ""}>{n.title}</span>
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
