import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "@/components/CalendarView";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export default async function CalendarPage() {
  const user = await requireUser();

  const [events, memberships] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { team: { memberships: { some: { userId: user.id } } } },
        ],
      },
      include: { team: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.teamMembership.findMany({
      where: { userId: user.id, teamRole: { in: ["COACH", "ADMIN"] } },
      include: { team: true },
    }),
  ]);

  return (
    <div className="workspace-page dash-in dash-in-1">
      <WorkspaceHeader section="Together" title="Schedule" description="See what is next. Keep your training, team events, and commitments in view." icon="calendar" />
      <CalendarView
        initialEvents={events.map((e) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt.toISOString(),
          location: e.location,
          teamName: e.team?.name ?? null,
        }))}
        manageableTeams={memberships.map((m) => ({ id: m.team.id, name: m.team.name }))}
      />
    </div>
  );
}
