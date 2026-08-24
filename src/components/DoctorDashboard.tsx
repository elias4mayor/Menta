import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { CARE_REASON_LABELS, type CareReason } from "@/lib/care";

/**
 * Doctor (MENTA Care provider) dashboard — mirrors the shape of the other
 * role dashboards (hero panel + quick actions + a real list), but the
 * "now" the provider actually needs is their care queue: pending requests
 * and today's scheduled appointments, both real CareRequest rows, not a
 * fabricated summary.
 */
export async function DoctorDashboard({ user }: { user: SessionUser }) {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [doctorProfile, pendingRequests, todaysAppointments, teams] = await Promise.all([
    prisma.doctorProfile.findUnique({ where: { userId: user.id } }),
    prisma.careRequest.findMany({
      where: { providerId: user.id, status: "REQUESTED" },
      include: { athlete: { select: { name: true } } },
      orderBy: { requestedStart: "asc" },
    }),
    prisma.careRequest.findMany({
      where: {
        providerId: user.id,
        status: { in: ["SCHEDULED", "FOLLOW_UP"] },
        scheduledStart: { gte: now, lte: todayEnd },
      },
      include: { athlete: { select: { name: true } } },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.teamMembership.findMany({
      where: { userId: user.id, teamRole: "DOCTOR" },
      include: { team: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="cockpit-grid mb-8">
        <div className="hero-panel dash-in-primary dash-in-3">
          <div className="mono text-text-3 mb-2">Now</div>
          <h2 className="text-2xl font-semibold mb-1">
            {doctorProfile?.title || `${user.name.split(" ")[0]}'s care queue`}
          </h2>
          <p className="text-text-2 text-sm mb-6">
            {teams.length > 0
              ? `Providing care across ${teams.length} team${teams.length === 1 ? "" : "s"}`
              : "Join a team to start receiving care requests."}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <Link href="/care/provider" className="block">
              <div className="cockpit-stat-value mb-1">{pendingRequests.length}</div>
              <div className="mono text-text-3">Pending requests</div>
            </Link>
            <Link href="/care/provider" className="block">
              <div className="cockpit-stat-value mb-1">{todaysAppointments.length}</div>
              <div className="mono text-text-3">Today&rsquo;s appointments</div>
            </Link>
          </div>
        </div>

        <div className="space-y-4 dash-in dash-in-4">
          <div className="context-card">
            <div className="mono text-text-3 mb-3">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Link href="/care/provider" className="btn-secondary justify-start">Open care queue</Link>
              <Link href="/team" className="btn-secondary justify-start">Manage teams</Link>
              <Link href="/ai-coach" className="btn-secondary justify-start">Ask MENTA AI</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 dash-in dash-in-5">
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Pending care requests</div>
          <Link href="/care/provider" className="text-xs text-text-2 hover:text-text-1">
            Open care queue →
          </Link>
        </div>
        {pendingRequests.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing waiting on you right now.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {pendingRequests.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>{r.athlete.name} — {CARE_REASON_LABELS[r.reason as CareReason]}</span>
                <span className="mono text-text-3">{new Date(r.requestedStart).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
