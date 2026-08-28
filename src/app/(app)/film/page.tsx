import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { visibleFilmWhere } from "@/lib/film-visibility";
import { hasTeamPermission, getUserPositionGroupIds } from "@/lib/permissions";
import { FilmLibrary } from "@/components/FilmLibrary";
import { GlowWaveText } from "@/components/GlowWaveText";

export default async function FilmPage() {
  const user = await requireUser();

  const [films, memberships] = await Promise.all([
    prisma.film.findMany({
      where: await visibleFilmWhere(user.id),
      include: { team: true, positionGroup: { select: { id: true, name: true } }, uploadedBy: true, _count: { select: { clips: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMembership.findMany({ where: { userId: user.id }, include: { team: true } }),
  ]);

  const teamsWithUpload = (
    await Promise.all(
      memberships.map(async (m) => {
        if (await hasTeamPermission(user.id, m.team.id, "UPLOAD_FILM")) {
          return { id: m.team.id, name: m.team.name, canUpload: true };
        }
        const groupIds = await getUserPositionGroupIds(user.id, m.team.id);
        for (const groupId of groupIds) {
          if (await hasTeamPermission(user.id, m.team.id, "UPLOAD_FILM", groupId)) {
            return { id: m.team.id, name: m.team.name, canUpload: true };
          }
        }
        return { id: m.team.id, name: m.team.name, canUpload: false };
      })
    )
  ).filter((t) => t.canUpload);

  const positionGroups = await prisma.positionGroup.findMany({
    where: { teamId: { in: teamsWithUpload.map((t) => t.id) } },
    select: { id: true, name: true, teamId: true },
  });

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Film</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Film library</GlowWaveText></h1>
      <FilmLibrary
        initialFilms={films.map((f) => ({
          id: f.id,
          title: f.title,
          category: f.category,
          opponent: f.opponent,
          season: f.season,
          visibility: f.visibility,
          teamName: f.team?.name ?? null,
          positionGroupName: f.positionGroup?.name ?? null,
          uploadedByName: f.uploadedBy.name,
          isMine: f.uploadedById === user.id,
          clipCount: f._count.clips,
          createdAt: f.createdAt.toISOString(),
        }))}
        teams={teamsWithUpload.map((t) => ({ id: t.id, name: t.name }))}
        positionGroups={positionGroups}
      />
    </div>
  );
}
