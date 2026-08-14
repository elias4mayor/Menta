import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm } from "@/lib/permissions";
import { readFileRange } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Streams the actual video bytes for a film, with HTTP Range support so
 * <video> scrubbing/seeking works. Kept as a separate route from the
 * metadata endpoint so the (potentially large) file response never gets
 * wrapped in JSON, and so every byte served still goes through the same
 * permission check as the metadata — private-by-default, per film.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new Response("Not signed in.", { status: 401 });

  const { id } = await context.params;
  const film = await prisma.film.findUnique({ where: { id } });
  if (!film) return new Response("Not found.", { status: 404 });
  if (!(await canViewFilm(user, film))) return new Response("Not found.", { status: 404 });

  const totalSize = film.sizeBytes;
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    const start = match ? Number(match[1]) : 0;
    const end = match && match[2] ? Number(match[2]) : totalSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= totalSize) {
      return new Response("Invalid range.", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    const { stream } = readFileRange(film.storageKey, totalSize, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": film.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const { stream } = readFileRange(film.storageKey, totalSize);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(totalSize),
      "Content-Type": film.mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
