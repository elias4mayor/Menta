import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canViewAthleteProfile } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

type AthleteSnapshot = {
  athleteId: string;
  name: string;
  sport: string | null;
  schoolName: string | null;
  workoutsThisWeek: number;
  activeGoals: number;
};

/**
 * Parent dashboard — the athlete snapshot below is real and permission-
 * checked (canViewAthleteProfile, the same server-side check every other
 * athlete-data surface in this app uses — an APPROVED GuardianLink is one
 * of the ways that check can pass, but it still goes through the shared
 * function rather than trusting the link status directly).
 *
 * It deliberately shows only training/goal counts. WellnessCheckIn,
 * MindCheckIn, EmergencyContact, and PersonalSafetyProfile are documented
 * HIGH-SENSITIVITY models (see their doc comments in schema.prisma) that
 * are private to the athlete by design — "guardian dashboard" is not on
 * their list of permitted surfaces, and adding them here would be a real
 * privacy regression, not a feature.
 */
export async function ParentDashboard({ user }: { user: SessionUser }) {
  const weekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);

  const [approvedLinks, pendingLinks, notifications] = await Promise.all([
    prisma.guardianLink.findMany({
      where: { guardianId: user.id, status: "APPROVED" },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    }),
    prisma.guardianLink.findMany({
      where: { guardianId: user.id, status: "PENDING" },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const snapshots: AthleteSnapshot[] = [];
  for (const link of approvedLinks) {
    const profile = await prisma.athleteProfile.findUnique({ where: { userId: link.athlete.id } });
    const allowed = await canViewAthleteProfile(user, link.athlete.id, profile?.visibility ?? "PRIVATE");
    if (!allowed) continue;

    const [workoutsThisWeek, activeGoals] = await Promise.all([
      prisma.workoutCompletion.count({ where: { userId: link.athlete.id, completedAt: { gte: weekAgo } } }),
      prisma.goal.count({ where: { userId: link.athlete.id, status: "ACTIVE" } }),
    ]);

    snapshots.push({
      athleteId: link.athlete.id,
      name: link.athlete.name,
      sport: profile?.sport ?? null,
      schoolName: profile?.schoolName ?? null,
      workoutsThisWeek,
      activeGoals,
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-5 mb-8">
        <div className="mono text-text-3 mb-3">Your athletes</div>
        {approvedLinks.length === 0 && pendingLinks.length === 0 ? (
          <p className="text-text-2 text-sm">
            You haven&rsquo;t connected an athlete yet.{" "}
            <Link href="/settings" className="text-text-1 hover:underline">
              Send a request from Settings
            </Link>{" "}
            using the email on their MENTA account.
          </p>
        ) : (
          <ul className="space-y-3">
            {approvedLinks.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {l.athlete.name} <span className="text-text-3">({l.athlete.email})</span>
                </span>
                <span className="badge badge-live">Connected</span>
              </li>
            ))}
            {pendingLinks.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {l.athlete.name} <span className="text-text-3">({l.athlete.email})</span>
                </span>
                <span className="badge">Pending approval</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/settings" className="text-xs text-text-2 hover:text-text-1 mt-3 inline-block">
          Manage connections →
        </Link>
      </div>

      {snapshots.length > 0 && (
        <div className="space-y-4 mb-8">
          {snapshots.map((s) => (
            <div key={s.athleteId} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="mono text-text-3">{s.name}&rsquo;s snapshot</div>
                {(s.sport || s.schoolName) && (
                  <span className="text-text-3 text-xs">{[s.sport, s.schoolName].filter(Boolean).join(" · ")}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-heading font-semibold">{s.workoutsThisWeek}</div>
                  <div className="mono text-text-3 text-xs">Workouts this week</div>
                </div>
                <div>
                  <div className="text-2xl font-heading font-semibold">{s.activeGoals}</div>
                  <div className="mono text-text-3 text-xs">Active goals</div>
                </div>
              </div>
              <p className="text-text-3 text-xs mt-3">
                Recovery, mindset, and safety information stay private to {s.name.split(" ")[0]} and aren&rsquo;t
                shared here.
              </p>
            </div>
          ))}
        </div>
      )}

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
