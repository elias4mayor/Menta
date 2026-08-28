import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canViewFilm, hasTeamPermission, isTeamFilmStaff } from "@/lib/permissions";
import { FilmWorkspace } from "@/components/FilmWorkspace";

export default async function FilmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const film = await prisma.film.findUnique({
    where: { id },
    include: {
      team: true,
      uploadedBy: true,
      clips: { include: { createdBy: true }, orderBy: { startSec: "asc" } },
    },
  });

  if (!film || !(await canViewFilm(user, film))) notFound();

  const isStaff = film.teamId ? await isTeamFilmStaff(user.id, film.teamId) : false;
  const [canTag, canManageTagDefinitions, canAnnotate, comments, tagDefinitions, tagInstances, annotations, reviewRequests] = await Promise.all([
    film.teamId ? hasTeamPermission(user.id, film.teamId, "TAG_FILM", film.positionGroupId) : false,
    film.teamId ? hasTeamPermission(user.id, film.teamId, "MANAGE_FILM_TAGS") : false,
    film.teamId ? hasTeamPermission(user.id, film.teamId, "ANNOTATE_FILM", film.positionGroupId) : false,
    prisma.filmComment.findMany({
      where: {
        filmId: id,
        deletedAt: null,
        OR: [{ visibility: "SHARED" }, { authorId: user.id }, ...(isStaff ? [{ visibility: "PRIVATE" as const }] : [])],
      },
      orderBy: { createdAt: "asc" },
    }),
    film.teamId ? prisma.filmTagDefinition.findMany({ where: { teamId: film.teamId }, orderBy: { createdAt: "asc" } }) : [],
    prisma.filmTagInstance.findMany({ where: { filmId: id }, include: { tagDefinition: true }, orderBy: { timestampSec: "asc" } }),
    prisma.filmAnnotation.findMany({ where: { filmId: id }, orderBy: { timestampSec: "asc" } }),
    prisma.filmReviewRequest.findMany({
      where: { filmId: id, ...(isStaff ? {} : { athleteId: user.id }) },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const authorIds = Array.from(new Set(comments.map((c) => c.authorId)));
  const authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } });
  const nameById = new Map(authors.map((a) => [a.id, a.name]));

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Film</div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h1 className="text-2xl font-semibold">{film.title}</h1>
        <span className="badge">{film.category}</span>
        {film.team && <span className="badge">{film.team.name}</span>}
      </div>
      {(film.opponent || film.season) && (
        <p className="text-text-2 text-sm mb-6">{[film.opponent, film.season].filter(Boolean).join(" · ")}</p>
      )}
      <FilmWorkspace
        film={{
          id: film.id,
          title: film.title,
          description: film.description,
          durationSec: film.durationSec,
          isMine: film.uploadedById === user.id,
        }}
        initialClips={film.clips.map((c) => ({
          id: c.id,
          startSec: c.startSec,
          endSec: c.endSec,
          label: c.label,
          notes: c.notes,
          createdByName: c.createdBy.name,
          isMine: c.createdById === user.id,
        }))}
        teamId={film.teamId}
        canComment
        canLeavePrivateComments={isStaff}
        canTag={canTag}
        canManageTagDefinitions={canManageTagDefinitions}
        canAnnotate={canAnnotate}
        initialComments={comments.map((c) => ({
          id: c.id,
          clipId: c.clipId,
          authorId: c.authorId,
          authorName: nameById.get(c.authorId) ?? "Unknown",
          timestampSec: c.timestampSec,
          body: c.body,
          visibility: c.visibility,
          parentId: c.parentId,
          createdAt: c.createdAt.toISOString(),
          editedAt: c.editedAt ? c.editedAt.toISOString() : null,
          isMine: c.authorId === user.id,
        }))}
        initialTagDefinitions={tagDefinitions.map((d) => ({ id: d.id, label: d.label, category: d.category }))}
        initialTags={tagInstances.map((t) => ({
          id: t.id,
          clipId: t.clipId,
          label: t.tagDefinition.label,
          category: t.tagDefinition.category,
          timestampSec: t.timestampSec,
          athleteId: t.athleteId,
          notes: t.notes,
          createdById: t.createdById,
        }))}
        initialAnnotations={annotations.map((a) => ({
          id: a.id,
          clipId: a.clipId,
          timestampSec: a.timestampSec,
          data: a.data,
          visibility: a.visibility,
        }))}
        initialReviewRequests={reviewRequests.map((r) => ({
          id: r.id,
          timestampSec: r.timestampSec,
          question: r.question,
          status: r.status,
          response: r.response,
        }))}
      />
    </div>
  );
}
