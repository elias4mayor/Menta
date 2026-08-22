import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/**
 * Parent dashboard — Phase 1 scope: shows only what's already safe to
 * show (which athletes have approved this guardian's link — the link
 * itself, not their private data). A real permission-gated athlete
 * snapshot (training/recovery/academics/safety, filtered through
 * canViewAthleteProfile) is Phase 3 work; showing invented "4 of 5
 * sessions this week" style cards before that data path actually exists
 * would be exactly the fake-data problem this project avoids elsewhere.
 */
export async function ParentDashboard({ user }: { user: SessionUser }) {
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

      {approvedLinks.length > 0 && (
        <div className="card p-5 mb-8">
          <div className="mono text-text-3 mb-3">Athlete snapshot</div>
          <p className="text-text-2 text-sm">
            Training, recovery, academics, and safety views for your connected athlete aren&rsquo;t built yet —
            they&rsquo;ll appear here once available.
          </p>
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
