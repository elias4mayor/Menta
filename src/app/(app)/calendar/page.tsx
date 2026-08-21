import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "@/components/CalendarView";
import { GlowWaveText } from "@/components/GlowWaveText";

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
    <div className="max-w-2xl mx-auto">
      <div className="mono text-text-3 mb-2">Calendar</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Schedule</GlowWaveText></h1>
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
