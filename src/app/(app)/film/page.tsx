import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { FilmLibrary } from "@/components/FilmLibrary";

export default async function FilmPage() {
  const user = await requireUser();

  const [films, memberships] = await Promise.all([
    prisma.film.findMany({
      where: {
        OR: [
          { uploadedById: user.id },
          { visibility: "PUBLIC" },
          { visibility: "TEAM", team: { memberships: { some: { userId: user.id } } } },
        ],
      },
      include: { team: true, uploadedBy: true, _count: { select: { clips: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMembership.findMany({ where: { userId: user.id }, include: { team: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="mono text-text-3 mb-2">Film</div>
      <h1 className="text-3xl font-semibold mb-8">Film library</h1>
      <FilmLibrary
        initialFilms={films.map((f) => ({
          id: f.id,
          title: f.title,
          category: f.category,
          opponent: f.opponent,
          season: f.season,
          visibility: f.visibility,
          teamName: f.team?.name ?? null,
          uploadedByName: f.uploadedBy.name,
          isMine: f.uploadedById === user.id,
          clipCount: f._count.clips,
          createdAt: f.createdAt.toISOString(),
        }))}
        teams={memberships.map((m) => ({ id: m.team.id, name: m.team.name }))}
      />
    </div>
  );
}
