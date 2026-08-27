import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canAccessPlaylist, canManagePlaylist } from "@/lib/playlists";
import { GlowWaveText } from "@/components/GlowWaveText";
import { PlaylistDetail } from "@/components/PlaylistDetail";

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const playlist = await prisma.filmPlaylist.findUnique({
    where: { id },
    include: {
      items: {
        include: { film: { select: { id: true, title: true } }, clip: { select: { id: true, label: true, filmId: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!playlist || !(await canAccessPlaylist(user.id, playlist))) notFound();

  const canManage = await canManagePlaylist(user.id, playlist);

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Playlist</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">{playlist.title}</GlowWaveText></h1>
      <PlaylistDetail
        playlistId={playlist.id}
        canManage={canManage}
        initialItems={playlist.items.map((i) => ({
          id: i.id,
          order: i.order,
          note: i.note,
          filmId: i.filmId,
          filmTitle: i.film?.title ?? null,
          clipId: i.clipId,
          clipLabel: i.clip?.label ?? null,
          clipFilmId: i.clip?.filmId ?? null,
        }))}
      />
    </div>
  );
}
