import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canAccessDocument } from "@/lib/permissions";
import { readFileRange } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Streams the actual document bytes — a separate route from the metadata
 * endpoint (same reasoning as films/[id]/video) so the storage key is
 * never sent to the client and every byte served goes through
 * canAccessDocument, not just the initial page load.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Not signed in.", { status: 401 });

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return new Response("Not found.", { status: 404 });
  if (!(await canAccessDocument(user, doc))) return new Response("Not found.", { status: 404 });

  const { stream } = readFileRange(doc.storageKey, doc.sizeBytes);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(doc.sizeBytes),
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.originalFilename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
