import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canViewFilm } from "@/lib/permissions";
import { FilmPlayer } from "@/components/FilmPlayer";

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

  return (
    <div className="max-w-3xl">
      <div className="mono text-text-3 mb-2">Film</div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h1 className="text-2xl font-semibold">{film.title}</h1>
        <span className="badge">{film.category}</span>
        {film.team && <span className="badge">{film.team.name}</span>}
      </div>
      {(film.opponent || film.season) && (
        <p className="text-text-2 text-sm mb-6">{[film.opponent, film.season].filter(Boolean).join(" · ")}</p>
      )}
      <FilmPlayer
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
      />
    </div>
  );
}
