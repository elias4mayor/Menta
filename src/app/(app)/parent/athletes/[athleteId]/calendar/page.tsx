import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { hasGuardianScope } from "@/lib/permissions";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

/**
 * Read-only team calendar for one linked athlete, gated behind
 * VIEW_TEAM_CALENDAR. Only TEAM/PUBLIC-visibility events — never a
 * PRIVATE (creator-only) personal calendar entry, even with this scope
 * granted; "team calendar" means team events, not the athlete's personal
 * schedule.
 */
export default async function ParentAthleteCalendarPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const user = await requireUser();
  const { athleteId } = await params;

  const link = await prisma.guardianLink.findFirst({
    where: { guardianId: user.id, athleteId, status: "APPROVED" },
    include: { athlete: { select: { id: true, name: true } } },
  });
  if (!link) notFound();

  const canViewCalendar = await hasGuardianScope(user.id, athleteId, "VIEW_TEAM_CALENDAR");

  const events = canViewCalendar
    ? await prisma.calendarEvent.findMany({
        where: {
          team: { memberships: { some: { userId: athleteId } } },
          visibility: { in: ["TEAM", "PUBLIC"] },
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 20,
      })
    : null;

  return (
    <div className="workspace-page dash-in dash-in-1">
      <WorkspaceHeader
        section="You"
        title={`${link.athlete.name}'s team calendar`}
        description="Shared with you by your athlete — read-only."
        icon="calendar"
      />

      <div className="card p-5">
        {!canViewCalendar ? (
          <p className="text-text-2 text-sm">{link.athlete.name} hasn&rsquo;t shared team calendar access with you.</p>
        ) : events!.length === 0 ? (
          <p className="text-text-2 text-sm">Nothing on the team calendar yet.</p>
        ) : (
          <ul className="space-y-3">
            {events!.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{e.title}</span>
                  {e.location ? <span className="text-text-3"> — {e.location}</span> : null}
                </span>
                <span className="text-text-3 shrink-0">{e.startsAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
