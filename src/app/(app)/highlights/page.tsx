import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { HighlightsView } from "@/components/HighlightsView";
import { GlowWaveText } from "@/components/GlowWaveText";

export default async function HighlightsPage() {
  const user = await requireUser();

  const highlights = await prisma.highlight.findMany({
    where: { userId: user.id },
    include: {
      items: { orderBy: { order: "asc" }, include: { clip: { include: { film: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Film</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Highlight reels</GlowWaveText></h1>
      <HighlightsView
        initialHighlights={highlights.map((h) => ({
          id: h.id,
          title: h.title,
          createdAt: h.createdAt.toISOString(),
          clips: h.items.map((item) => ({
            id: item.clip.id,
            label: item.clip.label,
            startSec: item.clip.startSec,
            endSec: item.clip.endSec,
            filmId: item.clip.filmId,
            filmTitle: item.clip.film.title,
          })),
        }))}
      />
    </div>
  );
}
