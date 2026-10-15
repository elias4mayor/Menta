import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getAiHealth } from "@/lib/ai";
import { getMyDay } from "@/lib/my-day";
import { GoalsPanel } from "@/components/GoalsPanel";
import { CountUpValue } from "@/components/CountUpValue";
import { TodaysPriorities } from "@/components/TodaysPriorities";
import { WorkspaceDisclosure } from "@/components/WorkspaceDisclosure";
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
      include: { completions: { where: { userId: user.id }, orderBy: { completedAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
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


  return (
    <div className="workspace-home">
      {myDay.todaySession ? <TodaysSessionCard session={myDay.todaySession} /> : null}
      <div className="workspace-cockpit">
      <section className="workspace-today" aria-label="Overview">
        <div className="workspace-today-top"><span className="workspace-eyebrow">Your day at a glance</span><time dateTime={now.toISOString().slice(0, 10)}>{now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</time></div>
      <div className="workspace-metrics" aria-label="Your progress overview">
        {[
          { label: "Workouts this week", value: completionsThisWeek, href: "/train" },
          { label: latestPerformanceEntry?.statName ?? "Latest stat", value: latestPerformanceEntry ? `${latestPerformanceEntry.value}${latestPerformanceEntry.unit ? ` ${latestPerformanceEntry.unit}` : ""}` : "—", href: "/performance" },
          { label: "Active goals", value: activeGoalsCount, href: "/dashboard#goals" },
          { label: "Teams", value: teamMemberships.length, href: "/team" },
        ].map((stat) => <Link key={stat.label} href={stat.href}><span>{typeof stat.value === "number" ? <CountUpValue value={stat.value} /> : stat.value}</span><small>{stat.label}</small></Link>)}
      </div>
        <h2>{heroHeadline}</h2>
        <p>{todayItemCount > 0 ? "Focus on what matters today. Everything else can wait." : "A little room to focus. Choose one thing to move forward."}</p>
        {moreToday.length ? <ul className="workspace-today-items">{moreToday.map((item) => <li key={item.id}>{item.label}</li>)}</ul> : null}
        <div className="workspace-today-actions"><Link href="/train" className="btn-primary">Start a workout <span aria-hidden="true">↗</span></Link><Link href="/film" className="workspace-text-link">Open film room →</Link></div>
      </section>

      <aside className="workspace-cockpit-stack" aria-label="Your next moves">
        <h2 className="workspace-panel-title">Your next moves</h2>
        <Link href="/dashboard#training-plan" className="workspace-glance workspace-glance-training">
          <span className="workspace-glance-icon" aria-hidden="true">↗</span>
          <div><span className="workspace-eyebrow">Next workout</span><h2>{planWorkouts[0]?.title ?? "Find your next session"}</h2><p>{profile?.trainingDaysPerWeek ? `${profile.trainingDaysPerWeek} training days per week` : "Open your training plan"}</p></div>
        </Link>
        <Link href="/dashboard#daily-brief" className="workspace-glance workspace-glance-ai">
          <span className="workspace-glance-icon" aria-hidden="true">✦</span>
          <div><span className="workspace-eyebrow">MENTA AI</span><h2>Your daily brief</h2><p>{aiHealth === "connected" ? "Bring your day into focus" : "Currently unavailable"}</p></div>
        </Link>
        <Link href="/calendar" className="workspace-glance workspace-glance-calendar">
          <span className="workspace-calendar-tile" aria-hidden="true"><small>{(upcoming[0]?.at ?? now).toLocaleDateString(undefined, { month: "short" })}</small><strong>{(upcoming[0]?.at ?? now).getDate()}</strong></span>
          <div><span className="workspace-eyebrow">On the horizon</span><h2>{upcoming[0]?.title ?? "Your calendar is clear"}</h2><p>{upcoming[0] ? upcoming[0].at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Make room for your next move"}</p></div>
        </Link>
      </aside>
      </div>



      {priorityGoals.length ? <section className="card p-5 mb-5"><TodaysPriorities goals={priorityGoals} /></section> : null}

      <div className="workspace-section-heading"><h2>A closer look</h2><span>Open only what you need</span></div>
      <div className="workspace-disclosure-list">
        <WorkspaceDisclosure id="training-plan" title="Your training plan" summary={`${planWorkouts.filter((workout) => workout.completions.length > 0).length} / ${planWorkouts.length} started${profile?.trainingDaysPerWeek ? ` · ${profile.trainingDaysPerWeek} days per week` : ""}`} icon="train">
          <PlanCard sport={profile?.sport ?? null} trainingDaysPerWeek={profile?.trainingDaysPerWeek ?? null} developmentAreas={demands?.developmentAreas ?? []} trainingNote={demands?.trainingNote ?? ""}
            workouts={planWorkouts.map((w) => ({ id: w.id, title: w.title, category: w.category, description: w.description, exercises: w.exercises ? JSON.parse(w.exercises) : [], yourCompletions: w.completions.length, lastCompletedAt: w.completions[0]?.completedAt.toISOString() ?? null }))} />
        </WorkspaceDisclosure>
        <WorkspaceDisclosure id="goals" title="Goals" summary={`${activeGoalsCount} active · Your longer-term focus`} icon="recruit">
          <GoalsPanel initial={goals.map((g) => ({ id: g.id, title: g.title, category: g.category, actionPlan: g.actionPlan, progress: g.progress, status: g.status, targetDate: g.targetDate ? g.targetDate.toISOString() : null }))} />
        </WorkspaceDisclosure>
        <WorkspaceDisclosure id="upcoming" title="Upcoming" summary={upcoming.length ? `${upcoming.length} upcoming item${upcoming.length === 1 ? "" : "s"} · ${upcoming[0].title}` : "No upcoming commitments"} icon="calendar">
          {upcoming.length ? <ul className="workspace-timeline">{upcoming.map((item) => <li key={`${item.kind}-${item.id}`}><time>{item.at.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time><span>{item.title}</span><span className="badge">{item.kind}</span></li>)}</ul> : <p className="text-sm text-text-2">Nothing on the calendar yet.</p>}
          <Link href="/calendar" className="workspace-text-link">Open calendar →</Link>
        </WorkspaceDisclosure>
        <WorkspaceDisclosure id="daily-brief" title="Daily brief" summary={aiHealth === "connected" ? "Ask MENTA to brief my day" : "MENTA AI is currently unavailable"} icon="spark">
          <DailyBrief />
          <Link href="/ai-coach" className="workspace-text-link">Open MENTA AI →</Link>
        </WorkspaceDisclosure>
        <WorkspaceDisclosure id="recent-activity" title="Recent activity" summary={notifications.length ? `${notifications.length} recent update${notifications.length === 1 ? "" : "s"}` : "You are all caught up"} icon="messages">
          {notifications.length ? <ul className="workspace-timeline">{notifications.map((n) => <li key={n.id}><span>{n.title}</span><time>{n.createdAt.toLocaleDateString()}</time></li>)}</ul> : <p className="text-sm text-text-2">Nothing yet.</p>}
          <Link href="/notifications" className="workspace-text-link">View all activity →</Link>
        </WorkspaceDisclosure>
      </div>
    </div>
  );
}
