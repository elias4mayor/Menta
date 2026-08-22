import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/**
 * Trainer dashboard — Phase 1 scope. There's no client/program-assignment
 * model yet (that's Phase 4/6 work — CoachProfile-style client roster +
 * the workout builder's "assign to athlete" feature), so this is
 * intentionally a real, honest starting point rather than a mockup with
 * invented client cards.
 */
export async function TrainerDashboard({ user }: { user: SessionUser }) {
  const [trainerProfile, notifications] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId: user.id } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const specialties: string[] = trainerProfile?.specialties ? JSON.parse(trainerProfile.specialties) : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-5 mb-8">
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

      <div className="card p-5 mb-8">
        <div className="mono text-text-3 mb-3">Clients</div>
        <p className="text-text-2 text-sm">
          Client and program management isn&rsquo;t built yet — this is where you&rsquo;ll see your athletes,
          assigned programs, and their progress.
        </p>
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
