import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { CARE_OPERATIONAL_STATUS_LABELS, type CareStatus } from "@/lib/care";

/**
 * Coach dashboard — Phase 1 scope: real data only (teams the coach
 * created or is a COACH-role member of, via the existing Team/
 * TeamMembership models — no second team system), no fabricated metrics
 * like a "team readiness score" that nothing in the schema backs yet.
 * Richer sections (film review queue, safety checklist status, academic
 * alerts) are later-phase work once those features have coach-facing
 * views of their own.
 */
export async function CoachDashboard({ user }: { user: SessionUser }) {
  const now = new Date();

  const [coachProfile, teams, notifications] = await Promise.all([
    prisma.coachProfile.findUnique({ where: { userId: user.id } }),
    prisma.team.findMany({
      where: {
        OR: [{ createdById: user.id }, { memberships: { some: { userId: user.id, teamRole: "COACH" } } }],
      },
      include: {
        memberships: true,
        events: { where: { startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 3 },
        workouts: { select: { id: true } },
        films: { select: { id: true } },
        safetyChecklistItems: { select: { status: true } },
        conversation: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  // Operational status only — never CareRequest.reason/reasonNote/providerNote.
  // A coach sees "care appointment scheduled," never why.
  const teamIds = teams.map((t) => t.id);
  const careStatuses =
    teamIds.length > 0
      ? await prisma.careRequest.findMany({
          where: { teamId: { in: teamIds }, status: { in: ["REQUESTED", "SCHEDULED", "FOLLOW_UP"] } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, status: true, scheduledStart: true, athlete: { select: { name: true } } },
        })
      : [];

  const focusAreas: string[] = coachProfile?.focusAreas ? JSON.parse(coachProfile.focusAreas) : [];
  const totalAthletes = teams.reduce((sum, t) => sum + t.memberships.filter((m) => m.teamRole === "ATHLETE").length, 0);
  const allEvents = teams
    .flatMap((t) => t.events.map((e) => ({ ...e, teamName: t.name })))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div className="max-w-6xl mx-auto">
      <div className="cockpit-grid mb-8">
        <div className="hero-panel dash-in-primary dash-in-3">
          <div className="mono text-text-3 mb-2">Now</div>
          <h2 className="text-2xl font-semibold mb-1">
            {allEvents[0] ? allEvents[0].title : "No practice scheduled today"}
          </h2>
          <p className="text-text-2 text-sm mb-6">
            {allEvents[0]
              ? `${allEvents[0].teamName} · ${new Date(allEvents[0].startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
              : "Check in with your roster or review recent film."}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: "Teams", value: teams.length, href: "/team" },
              { label: "Athletes", value: totalAthletes, href: "/team" },
              { label: "Upcoming events", value: allEvents.length, href: "/calendar" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="block">
                <div className="cockpit-stat-value mb-1">{stat.value}</div>
                <div className="mono text-text-3">{stat.label}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4 dash-in dash-in-4">
          <div className="context-card">
            <div className="flex items-center justify-between mb-3">
              <div className="mono text-text-3">Next up</div>
              <Link href="/calendar" className="text-xs text-text-2 hover:text-text-1">
                Calendar →
              </Link>
            </div>
            {allEvents.length === 0 ? (
              <p className="text-text-2 text-sm">Nothing on the calendar yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {allEvents.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-center justify-between">
                    <span>{e.title}</span>
                    <span className="mono text-text-3 text-xs">
                      {new Date(e.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="context-card">
            <div className="mono text-text-3 mb-3">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Link href="/team" className="btn-secondary justify-start">Manage roster</Link>
              <Link href="/film" className="btn-secondary justify-start">Review film</Link>
              <Link href="/ai-coach" className="btn-secondary justify-start">Ask MENTA Coach AI</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-8 dash-in dash-in-5">
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Your teams</div>
          <Link href="/team" className="text-xs text-text-2 hover:text-text-1">
            Manage teams →
          </Link>
        </div>
        {teams.length === 0 ? (
          <p className="text-text-2 text-sm">
            No teams yet.{" "}
            <Link href="/team" className="text-text-1 hover:underline">
              Create or join one
            </Link>{" "}
            to start managing your roster.
          </p>
        ) : (
          <ul className="space-y-4">
            {teams.map((t) => {
              const safetyDone = t.safetyChecklistItems.filter((i) => i.status === "COMPLETED").length;
              const safetyTotal = t.safetyChecklistItems.length;
              return (
                <li key={t.id} className="pb-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div>
                      <span className="font-medium">{t.name}</span>
                      {t.sport && <span className="text-text-3"> · {t.sport}</span>}
                    </div>
                    <span className="mono text-text-3 text-xs">
                      {t.memberships.filter((m) => m.teamRole === "ATHLETE").length} athletes
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/train" className="badge">{t.workouts.length} workouts</Link>
                    <Link href="/film" className="badge">{t.films.length} film</Link>
                    <Link href="/safety" className="badge">
                      Safety {safetyTotal > 0 ? `${safetyDone}/${safetyTotal}` : "not started"}
                    </Link>
                    {t.conversation && (
                      <Link href={`/messages/${t.conversation.id}`} className="badge">
                        Message team
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Care status</div>
          <Link href="/care" className="text-xs text-text-2 hover:text-text-1">Care →</Link>
        </div>
        {careStatuses.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing active. You only ever see status here, never why.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {careStatuses.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>{r.athlete.name}</span>
                <span className="text-text-2">
                  {CARE_OPERATIONAL_STATUS_LABELS[r.status as CareStatus]}
                  {r.scheduledStart && ` · ${new Date(r.scheduledStart).toLocaleDateString()}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card card-hover p-5 mb-8">
        <div className="mono text-text-3 mb-3">Coach profile</div>
        {coachProfile ? (
          <>
            <p className="text-sm mb-1">{coachProfile.coachingRole || "Role not set"}{coachProfile.sport ? ` · ${coachProfile.sport}` : ""}</p>
            <p className="text-text-2 text-sm">{coachProfile.organizationName || coachProfile.schoolName || "Organization not set"}</p>
            {focusAreas.length > 0 && (
              <p className="text-text-3 text-xs mt-2">Focused on: {focusAreas.join(" · ")}</p>
            )}
          </>
        ) : (
          <p className="text-text-2 text-sm">Finish onboarding to set up your coach profile.</p>
        )}
        <Link href="/profile" className="text-xs text-text-2 hover:text-text-1 mt-3 inline-block">
          View profile →
        </Link>
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
                <span className="mono text-text-3">{new Date(n.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
