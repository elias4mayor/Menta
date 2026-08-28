import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/**
 * Trainer dashboard — "clients" reuses the same Team/TeamMembership model
 * coaches use (TeamMembership.teamRole already includes "TRAINER"), not a
 * separate client-roster system: a trainer's clients are the athletes on
 * a team they're a trainer-role member of, created or joined the same way
 * a coach's team is (see TrainerOnboarding + /api/team, /api/team/join).
 * Individual 1:1 client assignment without a team, and program building/
 * assignment, are later-phase work (Phase 6, alongside the workout
 * builder) — this is real, not a mockup, just scoped to what the schema
 * already supports today.
 */
export async function TrainerDashboard({ user }: { user: SessionUser }) {
  const [trainerProfile, teams, notifications] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId: user.id } }),
    prisma.team.findMany({
      where: {
        OR: [{ createdById: user.id }, { memberships: { some: { userId: user.id, teamRole: "TRAINER" } } }],
      },
      include: {
        memberships: true,
        workouts: { select: { id: true } },
        conversation: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const specialties: string[] = trainerProfile?.specialties ? JSON.parse(trainerProfile.specialties) : [];
  const totalClients = teams.reduce((sum, t) => sum + t.memberships.filter((m) => m.teamRole === "ATHLETE").length, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="cockpit-grid mb-8">
        <div className="hero-panel dash-in-primary dash-in-3">
          <div className="mono text-text-3 mb-2">Now</div>
          <h2 className="text-2xl font-semibold mb-1">
            {trainerProfile?.businessName || `${user.name.split(" ")[0]}'s training`}
          </h2>
          <p className="text-text-2 text-sm mb-6">
            {trainerProfile?.sport
              ? `${trainerProfile.sport} · ${totalClients} client${totalClients === 1 ? "" : "s"} across ${teams.length} group${teams.length === 1 ? "" : "s"}`
              : "Finish onboarding to set up your training profile."}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <Link href="/team" className="block">
              <div className="cockpit-stat-value mb-1">{teams.length}</div>
              <div className="mono text-text-3">Groups</div>
            </Link>
            <Link href="/team" className="block">
              <div className="cockpit-stat-value mb-1">{totalClients}</div>
              <div className="mono text-text-3">Clients</div>
            </Link>
          </div>
        </div>

        <div className="space-y-4 dash-in dash-in-4">
          <div className="context-card">
            <div className="mono text-text-3 mb-3">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Link href="/team" className="btn-secondary justify-start">Manage groups</Link>
              <Link href="/train" className="btn-secondary justify-start">Training library</Link>
              <Link href="/ai-coach" className="btn-secondary justify-start">Ask MENTA Trainer AI</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-8 dash-in dash-in-5">
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Your clients</div>
          <Link href="/team" className="text-xs text-text-2 hover:text-text-1">
            Manage groups →
          </Link>
        </div>
        {teams.length === 0 ? (
          <p className="text-text-2 text-sm">
            No groups yet.{" "}
            <Link href="/team" className="text-text-1 hover:underline">
              Create or join one
            </Link>{" "}
            to start working with athletes.
          </p>
        ) : (
          <ul className="space-y-4">
            {teams.map((t) => (
              <li key={t.id} className="pb-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div>
                    <span className="font-medium">{t.name}</span>
                    {t.sport && <span className="text-text-3"> · {t.sport}</span>}
                  </div>
                  <span className="mono text-text-3 text-xs">
                    {t.memberships.filter((m) => m.teamRole === "ATHLETE").length} clients
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/train" className="badge">{t.workouts.length} workouts</Link>
                  {t.conversation && (
                    <Link href={`/messages/${t.conversation.id}`} className="badge">
                      Message group
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card card-hover p-5 mb-8">
        <div className="mono text-text-3 mb-3">Trainer profile</div>
        {trainerProfile ? (
          <>
            <p className="text-sm mb-1">
              {trainerProfile.businessName || `${user.name}'s training`}
              {trainerProfile.sport ? ` · ${trainerProfile.sport}` : ""}
            </p>
            <p className="text-text-2 text-sm">{trainerProfile.trainingLocation || "Location not set"}</p>
            {specialties.length > 0 && (
              <p className="text-text-3 text-xs mt-2">Specialties: {specialties.join(" · ")}</p>
            )}
          </>
        ) : (
          <p className="text-text-2 text-sm">Finish onboarding to set up your trainer profile.</p>
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
