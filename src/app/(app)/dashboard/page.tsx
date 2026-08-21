import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GoalsPanel } from "@/components/GoalsPanel";
import { DashboardHero } from "@/components/DashboardHero";
import { CountUpValue } from "@/components/CountUpValue";
import { TodaysPriorities } from "@/components/TodaysPriorities";

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
  const now = new Date();

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    profile,
    teamMemberships,
    todaysEvents,
    upcomingEvents,
    goals,
    notifications,
    aiConfigured,
    completionsThisWeek,
    latestPerformanceEntry,
  ] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
    prisma.teamMembership.findMany({
      where: { userId: user.id },
      include: { team: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startsAt: { gte: startOfDay(now), lte: endOfDay(now) },
        OR: [
          { createdById: user.id },
          { team: { memberships: { some: { userId: user.id } } } },
        ],
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startsAt: { gt: endOfDay(now), lte: weekAhead },
        OR: [
          { createdById: user.id },
          { team: { memberships: { some: { userId: user.id } } } },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
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
    Promise.resolve(Boolean(process.env.ANTHROPIC_API_KEY)),
    prisma.workoutCompletion.count({
      where: { userId: user.id, completedAt: { gte: weekAgo } },
    }),
    prisma.performanceEntry.findFirst({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
    }),
  ]);

  const firstName = user.name.split(" ")[0];
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

  return (
    <div className="max-w-5xl mx-auto">
      <DashboardHero greeting={`Hey ${firstName}.`} />
      <div className="card p-0 mb-8 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              {
                label: "Workouts this week",
                value: completionsThisWeek,
                href: "/train",
              },
              {
                label: latestPerformanceEntry?.statName ?? "Latest stat",
                value: latestPerformanceEntry
                  ? `${latestPerformanceEntry.value}${latestPerformanceEntry.unit ? ` ${latestPerformanceEntry.unit}` : ""}`
                  : "—",
                href: "/performance",
              },
              {
                label: "Active goals",
                value: activeGoalsCount,
                href: "/dashboard#goals",
              },
              {
                label: "Teams",
                value: teamMemberships.length,
                href: "/team",
              },
            ].map((stat, i) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="p-5"
                style={{
                  borderRight: i % 2 === 0 ? "1px solid var(--border-soft)" : undefined,
                  borderTop: i >= 2 ? "1px solid var(--border-soft)" : undefined,
                }}
              >
                <div className="text-3xl font-heading font-semibold mb-1">
                  {typeof stat.value === "number" ? <CountUpValue value={stat.value} /> : stat.value}
                </div>
                <div className="mono text-text-3">{stat.label}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="mono text-text-3">Today</div>
              <Link href="/calendar" className="text-xs text-text-2 hover:text-text-1">
                Full calendar →
              </Link>
            </div>
            {todaysEvents.length === 0 ? (
              <p className="text-text-2 text-sm">Nothing on your calendar today.</p>
            ) : (
              <ul className="space-y-3">
                {todaysEvents.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 text-sm">
                    <span className="mono text-text-3 w-14 shrink-0">
                      {new Date(event.startsAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>{event.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <TodaysPriorities goals={priorityGoals} />
          </div>

          <div
            className="card p-5"
            style={{
              border: "1px solid transparent",
              backgroundImage: "linear-gradient(var(--surface), var(--surface)), var(--grad-signal)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <div className="mono text-text-3 mb-3">MENTA AI</div>
            {aiConfigured ? (
              <span className="badge badge-live mb-3">Connected</span>
            ) : (
              <span className="badge badge-demo mb-3">Not connected</span>
            )}
            <p className="text-text-2 text-sm mb-4">
              {aiConfigured
                ? "Ask about training, recovery, recruiting, or academics."
                : "Set ANTHROPIC_API_KEY to turn on the live assistant."}
            </p>
            <Link href="/ai-coach" className="btn-secondary w-full justify-center">
              Open MENTA AI
            </Link>
          </div>
        </div>

        {upcomingEvents.length > 0 && (
          <div className="card p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="mono text-text-3">Coming up</div>
              <Link href="/calendar" className="text-xs text-text-2 hover:text-text-1">
                Full calendar →
              </Link>
            </div>
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-3 text-sm">
                  <span className="mono text-text-3 w-24 shrink-0">
                    {new Date(event.startsAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>{event.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="mono text-text-3 mb-3">Profile</div>
            {profile ? (
              <>
                <p className="text-sm mb-1">{profile.sport || "Sport not set"}</p>
                <p className="text-text-2 text-sm">{profile.schoolName || "School not set"}</p>
              </>
            ) : (
              <p className="text-text-2 text-sm">Finish onboarding to set up your profile.</p>
            )}
            <Link href="/profile" className="text-xs text-text-2 hover:text-text-1 mt-3 inline-block">
              View profile →
            </Link>
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

          <div className="card p-5">
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
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="mono text-text-3">Recent notifications</div>
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
  );
}
