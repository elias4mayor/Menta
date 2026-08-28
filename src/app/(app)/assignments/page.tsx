import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GlowWaveText } from "@/components/GlowWaveText";
import { AssignmentsList } from "@/components/AssignmentsList";

export default async function AssignmentsPage() {
  const user = await requireUser();

  const targets = await prisma.filmAssignmentTarget.findMany({
    where: { userId: user.id },
    include: {
      assignment: {
        include: { film: { select: { id: true, title: true } }, playlist: { select: { id: true, title: true } }, clip: { select: { id: true, label: true, filmId: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Film</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Assignments</GlowWaveText></h1>
      <AssignmentsList
        initialTargets={targets.map((t) => ({
          id: t.id,
          assignmentId: t.assignmentId,
          status: t.status,
          comment: t.comment,
          title: t.assignment.title,
          instructions: t.assignment.instructions,
          dueAt: t.assignment.dueAt ? t.assignment.dueAt.toISOString() : null,
          requiredViewing: t.assignment.requiredViewing,
          filmId: t.assignment.filmId ?? t.assignment.clip?.filmId ?? null,
          filmTitle: t.assignment.film?.title ?? null,
          playlistId: t.assignment.playlistId,
          playlistTitle: t.assignment.playlist?.title ?? null,
          clipLabel: t.assignment.clip?.label ?? null,
        }))}
      />
    </div>
  );
}
