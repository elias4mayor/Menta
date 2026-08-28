import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { hasTeamPermission } from "@/lib/permissions";
import { GlowWaveText } from "@/components/GlowWaveText";
import { CoachNotes } from "@/components/CoachNotes";

export default async function AthleteCoachNotesPage({
  params,
}: {
  params: Promise<{ teamId: string; athleteId: string }>;
}) {
  const user = await requireUser();
  const { teamId, athleteId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();
  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_COACH_NOTES"))) notFound();

  const athlete = await prisma.user.findUnique({ where: { id: athleteId }, select: { name: true } });
  if (!athlete) notFound();

  const notes = await prisma.coachNote.findMany({
    where: { teamId, athleteId },
    include: { film: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
  const coachIds = Array.from(new Set(notes.map((n) => n.coachId)));
  const coaches = await prisma.user.findMany({ where: { id: { in: coachIds } }, select: { id: true, name: true } });
  const nameById = new Map(coaches.map((c) => [c.id, c.name]));

  return (
    <div className="max-w-2xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{team.name}</div>
      <h1 className="text-3xl font-semibold mb-2">
        <GlowWaveText intensity="strong">{`Coach notes — ${athlete.name}`}</GlowWaveText>
      </h1>
      <p className="text-text-2 text-sm mb-8 max-w-xl">Private to coaching staff. Never shown to the athlete.</p>
      <CoachNotes
        teamId={teamId}
        athleteId={athleteId}
        initialNotes={notes.map((n) => ({
          id: n.id,
          coachId: n.coachId,
          coachName: nameById.get(n.coachId) ?? "Unknown",
          body: n.body,
          filmId: n.filmId,
          filmTitle: n.film?.title ?? null,
          createdAt: n.createdAt.toISOString(),
          isMine: n.coachId === user.id,
        }))}
      />
    </div>
  );
}
