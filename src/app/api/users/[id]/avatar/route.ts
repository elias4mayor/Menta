import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readFile } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serves a user's avatar image. Visible to any signed-in user (like most
 * products, an avatar is a lightweight "who is this" cue shown across
 * teams/messages/rosters) — not the strict per-document ownership model
 * Documents uses, since a profile photo isn't sensitive the way a
 * physical or medical form is. Still requires a session, so avatars
 * aren't served to the open internet.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getSessionUser();
  if (!viewer) return new Response("Not signed in.", { status: 401 });

  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { avatarKey: true, avatarMime: true } });
  if (!user?.avatarKey || !user.avatarMime) return new Response("Not found.", { status: 404 });

  const buffer = await readFile(user.avatarKey).catch(() => null);
  if (!buffer) return new Response("Not found.", { status: 404 });

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": user.avatarMime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
