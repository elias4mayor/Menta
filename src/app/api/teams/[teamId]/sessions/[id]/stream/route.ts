import { Client } from "pg";
import { NextResponse } from "next/server";
import { FORGE_CHANNEL, type ForgeMutation } from "@/lib/forge-events";
import { getSessionRoomView } from "@/lib/live-sessions";
import { getTeamRole } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const { teamId, id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const userId = user.id;

  async function hasAccess() {
    const current = await getSessionUser();
    if (!current || current.id !== userId) return false;
    return current.role === "SUPER_ADMIN" || Boolean(await getTeamRole(current.id, teamId));
  }

  if (!(await hasAccess())) return NextResponse.json({ error: "Not on this team." }, { status: 403 });
  if (!(await prisma.trainingSession.findFirst({ where: { id, teamId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return NextResponse.json({ error: "Forge stream is unavailable." }, { status: 503 });

  const client = new Client({ connectionString, connectionTimeoutMillis: 4000 });
  const encoder = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let refreshing = false;
      let pending = false;
      const mutations: ForgeMutation[] = [];
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      const deadline = setTimeout(() => stop(), 50_000);

      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(deadline);
        request.signal.removeEventListener("abort", stop);
        void client.end().catch(() => {});
        try { controller.close(); } catch { /* The reader already canceled. */ }
      };

      async function refresh() {
        pending = true;
        if (refreshing || closed) return;
        refreshing = true;
        try {
          while (pending && !closed) {
            pending = false;
            const batch = mutations.splice(0);
            if (!(await hasAccess())) {
              if (!closed) controller.enqueue(encoder.encode("event: forge.access-ended\ndata: {}\n\n"));
              stop();
              return;
            }
            const room = await getSessionRoomView(teamId, id, client);
            if (!room) { stop(); return; }
            if (!closed) controller.enqueue(encoder.encode(`event: forge.snapshot\ndata: ${JSON.stringify({ ...room, mutations: batch })}\n\n`));
          }
        } catch {
          stop();
        } finally {
          refreshing = false;
        }
      }

      client.on("error", stop);
      client.on("end", stop);
      client.on("notification", (notice) => {
        if (notice.channel !== FORGE_CHANNEL || !notice.payload) return;
        try {
          const { sessionId, correlationId, recordedAtMs } = JSON.parse(notice.payload);
          if (sessionId !== id || typeof correlationId !== "string" || !Number.isFinite(recordedAtMs)) return;
          if (mutations.length >= 1024) { stop(); return; }
          mutations.push({ correlationId, recordedAtMs });
          void refresh();
        } catch {
          // Ignore unrelated or malformed database notifications.
        }
      });
      request.signal.addEventListener("abort", stop, { once: true });
      if (request.signal.aborted) { stop(); return; }

      void (async () => {
        try {
          await client.connect();
          if (closed) return;
          await client.query(`LISTEN ${FORGE_CHANNEL}`);
          if (closed) return;
          // Listen first so a commit during the snapshot causes another refresh.
          await refresh();
          if (!closed) heartbeat = setInterval(() => void refresh(), 15_000);
        } catch {
          stop();
        }
      })();
    },
    cancel() { stop(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
