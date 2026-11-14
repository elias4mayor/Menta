import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { gate1Service, Gate1Error, parse, uploadSchema } from "@/lib/gate1/service";
import { inspectVideo } from "@/lib/gate1/media";
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES, isUploadStorageConfigured, saveFile, deleteFile, extensionForMimeType } from "@/lib/storage";
import { getTeamCurrentStateLimit } from "@/lib/entitlements";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = gate1Service(prisma);
type Context = { params: Promise<{ path: string[] }> };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function handle(request: Request, context: Context) {
  const actor = await getSessionUser(); if (!actor) return json({ error: "UNAUTHENTICATED" }, 401);
  try {
    const { path } = await context.params;
    if (request.method === "GET") {
      if (path.length === 1 && path[0] === "today") return json(await service.today(actor, new URL(request.url).searchParams.get("timeZone") ?? "UTC"));
      if (path.length !== 2) throw new Gate1Error(404, "NOT_FOUND");
      if (path[0] === "evidence") return json(await service.readEvidence(actor, path[1]));
      if (path[0] === "observations") return json(await service.readObservation(actor, path[1]));
      if (path[0] === "assignments") return json(await service.readAssignment(actor, path[1]));
      if (path[0] === "submissions") return json(await service.readSubmission(actor, path[1]));
      if (path[0] === "playback") {
        // This URL is not a bearer token: /video repeats authorization on every GET.
        await service.playback(actor, path[1]);
        return json({ playbackUrl: `/api/films/${encodeURIComponent(path[1])}/video`, authorization: "SESSION_PER_REQUEST" });
      }
      throw new Gate1Error(404, "NOT_FOUND");
    }
    // Cookie-authenticated mutations need an exact same-origin request.
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new Gate1Error(403, "INVALID_ORIGIN");
    if (request.method === "POST" && path.length === 1 && path[0] === "evidence") {
      if (!isUploadStorageConfigured()) throw new Gate1Error(503, "STORAGE_UNAVAILABLE");
      const limit = Math.min(MAX_UPLOAD_BYTES, 50 * 1024 * 1024);
      const contentLength = Number(request.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > limit + 65536) throw new Gate1Error(413, "UPLOAD_TOO_LARGE");
      const form = await request.formData(); const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > limit) throw new Gate1Error(413, "UPLOAD_SIZE");
      if (!ALLOWED_VIDEO_TYPES.includes(file.type as typeof ALLOWED_VIDEO_TYPES[number])) throw new Gate1Error(415, "VIDEO_TYPE");
      const input = parse(uploadSchema, { athleteId: form.get("athleteId"), teamId: form.get("teamId"), protocolVersionId: form.get("protocolVersionId"),
        title: form.get("title"), recordedAt: form.get("recordedAt"), captureNotes: form.get("captureNotes"), recordingRightsConfirmed: form.get("recordingRightsConfirmed") === "true" });
      await service.authorizeUpload(actor, input);
      const quota = await getTeamCurrentStateLimit(input.teamId, "FILM_STORAGE_GB");
      if (quota !== null) {
        const used = await prisma.film.aggregate({ where: { teamId: input.teamId }, _sum: { sizeBytes: true } });
        if ((used._sum.sizeBytes ?? 0) + file.size > quota * 1024 ** 3) throw new Gate1Error(402, "STORAGE_LIMIT");
      }
      const bytes = Buffer.from(await file.arrayBuffer()); const measured = await inspectVideo(bytes);
      const storageKey = `gate1/${randomUUID()}.${extensionForMimeType(file.type)}`;
      await saveFile(storageKey, bytes, file.type);
      try {
        return json(await service.registerInspectedUpload(actor, input, { ...measured, storageKey, mimeType: file.type, sizeBytes: file.size, originalFilename: file.name }), 201);
      } catch (e) { await deleteFile(storageKey).catch(() => undefined); throw e; }
    }
    if (request.method === "DELETE" && path.length === 2 && path[0] === "grants") return json(await service.revoke(actor, path[1]));
    const body = await request.json();
    if (request.method === "POST" && path.length === 1) {
      switch (path[0]) {
        case "protocols": return json(await service.createProtocol(actor, body), 201);
        case "observations": return json(await service.observe(actor, body), 201);
        case "assignments": return json(await service.create(actor, body), 201);
        case "accept": return json(await service.accept(actor, body));
        case "submit": return json(await service.submit(actor, body));
        case "review": return json(await service.review(actor, body));
        case "grants": return json(await service.grant(actor, body), 201);
      }
    }
    if (request.method === "PATCH" && path.length === 2 && path[0] === "observations") return json(await service.editObservation(actor, path[1], body));
    throw new Gate1Error(404, "NOT_FOUND");
  } catch (e) {
    if (e instanceof Gate1Error) return json({ error: e.code }, e.status);
    if (e instanceof SyntaxError || e instanceof TypeError) return json({ error: "INVALID_INPUT" }, 400);
    console.error("Gate 1 request failed", e instanceof Error ? e.name : "unknown");
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
