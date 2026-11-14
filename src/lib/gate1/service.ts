import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type Gate1Action, type Gate1Resource } from "@prisma/client";
import { z } from "zod";
import { urgency, compareToday } from "./today";

// Actor is supplied by the session adapter, never from request JSON.
export type Actor = { id: string };
type Tx = Prisma.TransactionClient;
export class Gate1Error extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
function deny(): never { throw new Gate1Error(404, "NOT_FOUND"); };
function invalid(code = "INVALID_INPUT"): never { throw new Gate1Error(422, code); };
function conflict(): never { throw new Gate1Error(409, "CONFLICT"); };
const id = z.string().min(1).max(128);
const note = z.string().trim().min(1).max(4000);
const key = z.string().min(8).max(128);
const revision = z.number().int().positive();
export const createSchema = z.object({ athleteId: id, teamId: id, observationId: id, protocolVersionId: id,
  baselineEvidenceId: id, customCue: note, successCriterion: note, dueAt: z.coerce.date(), operationKey: key }).strict();
export const acceptSchema = z.object({ assignmentId: id, expectedVersion: revision, operationKey: key }).strict();
export const submitSchema = acceptSchema.extend({ evidenceId: id, athleteNotes: note.optional() }).strict();
export const reviewSchema = acceptSchema.extend({ submissionId: id, decision: z.enum(["CLOSED", "NEEDS_REVISION"]),
  feedbackNote: note, comparability: z.enum(["COMPARABLE", "NOT_COMPARABLE"]), comparabilityNotes: note }).strict();
export const observationSchema = z.object({ evidenceId: id, startSec: z.number().finite().nonnegative(), endSec: z.number().finite().positive(),
  observationNote: note, interpretationNote: note.optional() }).strict();
export const protocolSchema = z.object({ teamId: id, exerciseId: id, versionNumber: revision,
  instructions: note, cameraSetupNotes: note, units: z.string().trim().min(1).max(80).optional(), successRubric: note }).strict();
export const uploadSchema = z.object({ athleteId: id, teamId: id, protocolVersionId: id, title: z.string().trim().min(1).max(200),
  recordedAt: z.coerce.date(), captureNotes: note, recordingRightsConfirmed: z.literal(true) }).strict();
export const grantSchema = z.object({ athleteId: id, teamId: id, granteeId: id,
  resourceType: z.enum(["ATHLETE", "EVIDENCE", "OBSERVATION", "ASSIGNMENT", "SUBMISSION"]), resourceId: id,
  permittedActions: z.array(z.enum(["READ", "PLAY_MEDIA", "UPLOAD_EVIDENCE", "CREATE_OBSERVATION", "EDIT_OBSERVATION"])).min(1).max(5),
  expiresAt: z.coerce.date() }).strict();

// Non-HTTP workers may call these services; all invariants are rechecked here.
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value); if (!r.success) return invalid(); return r.data;
}
export async function withTransaction<T>(db: PrismaClient, fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(fn, { isolationLevel: "Serializable", timeout: 15000 }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 2) {
        await new Promise(r => setTimeout(r, 15 * (attempt + 1))); continue;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2025", "P2034"].includes(e.code)) conflict();
      throw e;
    }
  }
}
async function role(tx: Tx, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } });
  if (!user) return deny(); return user.role;
}
async function athleteInTeam(tx: Tx, athleteId: string, teamId: string) {
  const member = await tx.teamMembership.findUnique({ where: { userId_teamId: { userId: athleteId, teamId } }, include: { user: { select: { role: true } } } });
  return member?.teamRole === "ATHLETE" && member.user.role === "ATHLETE";
}
async function isCoach(tx: Tx, actor: Actor, athleteId: string, teamId: string) {
  if (actor.id === athleteId || !(await athleteInTeam(tx, athleteId, teamId))) return false;
  const m = await tx.teamMembership.findUnique({ where: { userId_teamId: { userId: actor.id, teamId } }, include: { user: { select: { role: true } } } });
  return m?.teamRole === "COACH" && m.user.role === "COACH" && m.verifiedAt !== null;
}
async function requireCoach(tx: Tx, actor: Actor, athleteId: string, teamId: string) {
  if (!(await isCoach(tx, actor, athleteId, teamId))) deny();
}
async function hasGrant(tx: Tx, actor: Actor, scope: { athleteId: string; teamId: string }, resourceType: Gate1Resource, resourceId: string, action: Gate1Action) {
  const actorRole = await role(tx, actor);
  if (!["PARENT", "TRAINER", "RECRUITER"].includes(actorRole)) return false;
  return Boolean(await tx.consentGrant.findFirst({ where: { athleteId: scope.athleteId, teamId: scope.teamId, granteeId: actor.id, resourceType, resourceId,
    revokedAt: null, expiresAt: { gt: new Date() }, permittedActions: { has: action } } }));
}
async function evidence(tx: Tx, evidenceId: string) {
  const e = await tx.gate1Evidence.findUnique({ where: { id: evidenceId }, include: { film: true, protocolVersion: true } });
  if (!e) return deny(); return e;
}
async function requireEvidenceRead(tx: Tx, actor: Actor, e: Awaited<ReturnType<typeof evidence>>, action: "READ" | "PLAY_MEDIA") {
  if (actor.id === e.athleteId && await role(tx, actor) === "ATHLETE") return;
  if (await isCoach(tx, actor, e.athleteId, e.teamId)) return;
  if (await hasGrant(tx, actor, e, "EVIDENCE", e.id, action)) return;
  deny();
}
async function assignment(tx: Tx, actor: Actor, assignmentId: string, purpose: "READ" | "ATHLETE" | "COACH") {
  const a = await tx.actionAssignment.findUnique({ where: { id: assignmentId } }); if (!a) return deny();
  const own = actor.id === a.athleteId && await role(tx, actor) === "ATHLETE";
  if (purpose === "ATHLETE") { if (!own || !(await athleteInTeam(tx, a.athleteId, a.teamId))) deny(); }
  else if (purpose === "COACH") await requireCoach(tx, actor, a.athleteId, a.teamId);
  else if (!own && !(await isCoach(tx, actor, a.athleteId, a.teamId))) {
    if (await role(tx, actor) === "PARENT" || !(await hasGrant(tx, actor, a, "ASSIGNMENT", a.id, "READ"))) deny();
  }
  return a;
}
function hash(operation: string, data: unknown) { return createHash("sha256").update(JSON.stringify([operation, data])).digest("hex"); }
async function receipt(tx: Tx, actor: Actor, operationKey: string, requestHash: string) {
  const h = await tx.assignmentStateHistory.findUnique({ where: { actorId_operationKey: { actorId: actor.id, operationKey } } });
  if (h && h.requestHash !== requestHash) conflict();
  return h ? { assignmentId: h.assignmentId, status: h.newState, version: h.version, submissionId: h.submissionId, reviewId: h.reviewId } : null;
}
async function transition(tx: Tx, actor: Actor, a: Awaited<ReturnType<typeof assignment>>, status: "ACCEPTED" | "SUBMITTED" | "NEEDS_REVISION" | "CLOSED",
  input: { expectedVersion: number; operationKey: string }, requestHash: string, refs: { submissionId?: string; reviewId?: string; attemptNumber?: number } = {}) {
  if (a.version !== input.expectedVersion) conflict();
  const updated = await tx.actionAssignment.updateMany({ where: { id: a.id, version: a.version, status: a.status },
    data: { status, version: { increment: 1 }, ...(refs.attemptNumber ? { currentAttemptNumber: refs.attemptNumber } : {}) } });
  if (updated.count !== 1) conflict();
  await tx.assignmentStateHistory.create({ data: { assignmentId: a.id, actorId: actor.id, previousState: a.status, newState: status,
    version: a.version + 1, submissionId: refs.submissionId, reviewId: refs.reviewId, operationKey: input.operationKey, requestHash } });
  return { assignmentId: a.id, status, version: a.version + 1, submissionId: refs.submissionId ?? null, reviewId: refs.reviewId ?? null };
}
export function gate1Service(db: PrismaClient) {
  return {
    async createProtocol(actor: Actor, raw: unknown) {
      const input = parse(protocolSchema, raw);
      return withTransaction(db, async tx => {
        const m = await tx.teamMembership.findUnique({ where: { userId_teamId: { userId: actor.id, teamId: input.teamId } } });
        if (await role(tx, actor) !== "COACH" || m?.teamRole !== "COACH" || !m.verifiedAt) deny();
        const ex = await tx.exercise.findUnique({ where: { id: input.exerciseId } });
        const team = await tx.team.findUnique({ where: { id: input.teamId } });
        if (!ex || ex.teamId !== input.teamId || !ex.sport || ex.sport !== team?.sport) return invalid("EXERCISE_CONTEXT");
        const { teamId: _, ...data } = input; void _;
        return tx.protocolVersion.create({ data: { ...data, sport: ex.sport } });
      });
    },
    async authorizeUpload(actor: Actor, raw: unknown) {
      const input = parse(uploadSchema, raw);
      return withTransaction(db, tx => authorizeUpload(tx, actor, input));
    },
    // Called only after server-side object inspection. Never bind descriptor to HTTP JSON.
    async registerInspectedUpload(actor: Actor, raw: unknown, descriptor: { storageKey: string; mimeType: string; sizeBytes: number; originalFilename: string; durationSec: number; sha256: string }) {
      const input = parse(uploadSchema, raw);
      if (!Number.isFinite(descriptor.durationSec) || descriptor.durationSec <= 0 || !/^[a-f0-9]{64}$/.test(descriptor.sha256)) invalid("INVALID_MEDIA_METADATA");
      return withTransaction(db, async tx => {
        await authorizeUpload(tx, actor, input);
        const f = await tx.film.create({ data: { title: input.title, uploadedById: actor.id, teamId: input.teamId, visibility: "PRIVATE",
          storageKey: descriptor.storageKey, mimeType: descriptor.mimeType, sizeBytes: descriptor.sizeBytes, originalFilename: descriptor.originalFilename, durationSec: descriptor.durationSec } });
        return tx.gate1Evidence.create({ data: { filmId: f.id, athleteId: input.athleteId, teamId: input.teamId, protocolVersionId: input.protocolVersionId,
          method: actor.id === input.athleteId ? "SELF_REPORTED" : "COACH_ENTERED", recordedAt: input.recordedAt,
          captureNotes: input.captureNotes, metadataVerifiedAt: new Date(), recordingRightsConfirmedAt: new Date(), contentSha256: descriptor.sha256 } });
      });
    },
    async observe(actor: Actor, raw: unknown) {
      const input = parse(observationSchema, raw);
      return withTransaction(db, async tx => {
        const e = await evidence(tx, input.evidenceId);
        const coach = await isCoach(tx, actor, e.athleteId, e.teamId);
        if (!coach && !(await role(tx, actor) === "TRAINER" && await hasGrant(tx, actor, e, "EVIDENCE", e.id, "CREATE_OBSERVATION"))) deny();
        if (!e.film.durationSec || input.endSec > e.film.durationSec || input.startSec >= input.endSec) invalid("CLIP_RANGE");
        const c = await tx.clip.create({ data: { filmId: e.filmId, createdById: actor.id, startSec: input.startSec, endSec: input.endSec, label: "Next Move observation" } });
        return tx.gate1Observation.create({ data: { evidenceId: e.id, clipId: c.id, authorId: actor.id, observationNote: input.observationNote, interpretationNote: input.interpretationNote } });
      });
    },
    async editObservation(actor: Actor, observationId: string, raw: unknown) {
      const input = parse(z.object({ observationNote: note, interpretationNote: note.optional() }).strict(), raw);
      return withTransaction(db, async tx => {
        const o = await tx.gate1Observation.findUnique({ where: { id: observationId }, include: { evidence: true } }); if (!o) return deny();
        const coach = await isCoach(tx, actor, o.evidence.athleteId, o.evidence.teamId);
        if (!coach && !(await role(tx, actor) === "TRAINER" && o.authorId === actor.id && await hasGrant(tx, actor, o.evidence, "OBSERVATION", o.id, "EDIT_OBSERVATION"))) deny();
        if (await tx.actionAssignment.count({ where: { observationId } })) conflict();
        return tx.gate1Observation.update({ where: { id: observationId }, data: input });
      });
    },
    async create(actor: Actor, raw: unknown) {
      const input = parse(createSchema, raw); const requestHash = hash("create", input);
      return withTransaction(db, async tx => {
        await requireCoach(tx, actor, input.athleteId, input.teamId);
        const prior = await receipt(tx, actor, input.operationKey, requestHash); if (prior) return prior;
        const e = await evidence(tx, input.baselineEvidenceId);
        const o = await tx.gate1Observation.findUnique({ where: { id: input.observationId } });
        if (!o || o.evidenceId !== e.id || e.athleteId !== input.athleteId || e.teamId !== input.teamId || e.protocolVersionId !== input.protocolVersionId) invalid("EVIDENCE_CONTEXT");
        const { operationKey, ...data } = input;
        const a = await tx.actionAssignment.create({ data: { ...data, assignedById: actor.id } });
        await tx.assignmentStateHistory.create({ data: { assignmentId: a.id, actorId: actor.id, newState: "ASSIGNED", version: 1, operationKey, requestHash } });
        return { assignmentId: a.id, status: a.status, version: a.version, submissionId: null, reviewId: null };
      });
    },
    async accept(actor: Actor, raw: unknown) {
      const input = parse(acceptSchema, raw); const requestHash = hash("accept", input);
      return withTransaction(db, async tx => {
        const a = await assignment(tx, actor, input.assignmentId, "ATHLETE");
        const prior = await receipt(tx, actor, input.operationKey, requestHash); if (prior) return prior;
        if (a.status !== "ASSIGNED") conflict();
        return transition(tx, actor, a, "ACCEPTED", input, requestHash);
      });
    },
    async submit(actor: Actor, raw: unknown) {
      const input = parse(submitSchema, raw); const requestHash = hash("submit", input);
      return withTransaction(db, async tx => {
        const a = await assignment(tx, actor, input.assignmentId, "ATHLETE");
        const prior = await receipt(tx, actor, input.operationKey, requestHash); if (prior) return prior;
        if (!["ACCEPTED", "NEEDS_REVISION"].includes(a.status) || a.version !== input.expectedVersion) conflict();
        const e = await evidence(tx, input.evidenceId);
        if (e.athleteId !== a.athleteId || e.teamId !== a.teamId || e.protocolVersionId !== a.protocolVersionId || e.id === a.baselineEvidenceId) invalid("EVIDENCE_CONTEXT");
        const baseline = await evidence(tx, a.baselineEvidenceId);
        if (e.contentSha256 === baseline.contentSha256 || e.recordedAt <= baseline.recordedAt) invalid("RETEST_NOT_NEW");
        const s = await tx.assignmentSubmission.create({ data: { assignmentId: a.id, evidenceId: e.id, attemptNumber: a.currentAttemptNumber + 1, athleteNotes: input.athleteNotes } });
        return transition(tx, actor, a, "SUBMITTED", input, requestHash, { submissionId: s.id, attemptNumber: s.attemptNumber });
      });
    },
    async review(actor: Actor, raw: unknown) {
      const input = parse(reviewSchema, raw); const requestHash = hash("review", input);
      return withTransaction(db, async tx => {
        const a = await assignment(tx, actor, input.assignmentId, "COACH");
        const prior = await receipt(tx, actor, input.operationKey, requestHash); if (prior) return prior;
        if (a.status !== "SUBMITTED" || a.version !== input.expectedVersion) conflict();
        const s = await tx.assignmentSubmission.findUnique({ where: { id: input.submissionId }, include: { review: true } });
        if (!s || s.assignmentId !== a.id || s.attemptNumber !== a.currentAttemptNumber || s.review) conflict();
        if (input.decision === "CLOSED" && input.comparability !== "COMPARABLE") invalid("COMPARABLE_RETEST_REQUIRED");
        const r = await tx.assignmentReview.create({ data: { submissionId: s.id, reviewerId: actor.id, decision: input.decision,
          feedbackNote: input.feedbackNote, comparability: input.comparability, comparabilityNotes: input.comparabilityNotes } });
        return transition(tx, actor, a, input.decision, input, requestHash, { submissionId: s.id, reviewId: r.id });
      });
    },
    async readEvidence(actor: Actor, evidenceId: string) {
      return withTransaction(db, async tx => {
        const e = await evidence(tx, evidenceId); await requireEvidenceRead(tx, actor, e, "READ");
        return { id: e.id, filmId: e.filmId, protocol: { instructions: e.protocolVersion.instructions, cameraSetupNotes: e.protocolVersion.cameraSetupNotes, successRubric: e.protocolVersion.successRubric }, athleteId: e.athleteId, teamId: e.teamId, title: e.film.title, durationSec: e.film.durationSec,
          method: e.method, recordedAt: e.recordedAt, metadataVerifiedAt: e.metadataVerifiedAt, captureNotes: e.captureNotes, protocolVersionId: e.protocolVersionId };
      });
    },
    async playback(actor: Actor, filmId: string) {
      return withTransaction(db, async tx => {
        const row = await tx.gate1Evidence.findUnique({ where: { filmId } }); if (!row) return deny();
        const e = await evidence(tx, row.id); await requireEvidenceRead(tx, actor, e, "PLAY_MEDIA");
        return { storageKey: e.film.storageKey, sizeBytes: e.film.sizeBytes, mimeType: e.film.mimeType };
      });
    },
    async readAssignment(actor: Actor, assignmentId: string) {
      return withTransaction(db, tx => assignment(tx, actor, assignmentId, "READ"));
    },
    async readObservation(actor: Actor, observationId: string) {
      return withTransaction(db, async tx => {
        const o = await tx.gate1Observation.findUnique({ where: { id: observationId }, include: { evidence: true, clip: true } }); if (!o) return deny();
        const coach = await isCoach(tx, actor, o.evidence.athleteId, o.evidence.teamId);
        const ownAssigned = actor.id === o.evidence.athleteId && await role(tx, actor) === "ATHLETE" && await tx.actionAssignment.count({ where: { observationId, athleteId: actor.id } });
        const granted = await role(tx, actor) !== "PARENT" && await hasGrant(tx, actor, o.evidence, "OBSERVATION", o.id, "READ");
        if (!coach && !ownAssigned && !granted) deny();
        return { id: o.id, evidenceId: o.evidenceId, authorId: o.authorId, observationNote: o.observationNote, interpretationNote: o.interpretationNote, method: o.method, startSec: o.clip.startSec, endSec: o.clip.endSec };
      });
    },
    async readSubmission(actor: Actor, submissionId: string) {
      return withTransaction(db, async tx => {
        const s = await tx.assignmentSubmission.findUnique({ where: { id: submissionId }, include: { assignment: true, review: true } }); if (!s) return deny();
        const a = s.assignment;
        const own = actor.id === a.athleteId && await role(tx, actor) === "ATHLETE";
        if (!own && !(await isCoach(tx, actor, a.athleteId, a.teamId)) && (await role(tx, actor) === "PARENT" || !(await hasGrant(tx, actor, a, "SUBMISSION", s.id, "READ")))) deny();
        const { assignment: _, ...result } = s; void _; return result;
      });
    },
    async today(actor: Actor, timeZone = "UTC", now = new Date()) {
      try { new Intl.DateTimeFormat("en", { timeZone }).format(now); } catch { invalid("INVALID_TIMEZONE"); }
      return withTransaction(db, async tx => {
        const actorRole = await role(tx, actor);
        if (!["ATHLETE", "COACH"].includes(actorRole)) deny();
        const coach = actorRole === "COACH";
        const memberships = await tx.teamMembership.findMany({ where: { userId: actor.id, teamRole: coach ? "COACH" : "ATHLETE", ...(coach ? { verifiedAt: { not: null } } : {}) }, select: { teamId: true } });
        const rows = await tx.actionAssignment.findMany({ where: {
          teamId: { in: memberships.map(m => m.teamId) },
          ...(coach ? { athlete: { role: "ATHLETE" } } : { athleteId: actor.id }),
          status: { in: coach ? ["ASSIGNED", "ACCEPTED", "NEEDS_REVISION", "SUBMITTED"] : ["ASSIGNED", "ACCEPTED", "NEEDS_REVISION"] }
        }, include: { athlete: { select: { name: true } }, assignedBy: { select: { name: true } }, team: { select: { name: true } },
          protocolVersion: { select: { exercise: { select: { name: true } } } }, submissions: { orderBy: { attemptNumber: "desc" }, take: 1, select: { id: true, submittedAt: true } } } });
        const queue = [];
        for (const row of rows) {
          if (coach && !(await athleteInTeam(tx, row.athleteId, row.teamId))) continue;
          const score = urgency(row.status, row.dueAt, now, timeZone, coach, row.submissions[0]?.submittedAt);
          if (!score) continue;
          queue.push({ assignmentId: row.id, roleView: coach ? "COACH" : "ATHLETE", ...score,
            title: row.protocolVersion.exercise.name, customCue: row.customCue, status: row.status, version: row.version, dueAt: row.dueAt,
            counterpartyName: coach ? row.athlete.name : row.assignedBy.name, teamName: row.team.name,
            hasLinkedObservation: true, ...((coach && row.status === "SUBMITTED") || (!coach && row.status === "NEEDS_REVISION") ? { latestSubmissionId: row.submissions[0]?.id } : {}) });
        }
        queue.sort(compareToday);
        return { generatedAt: now, timeZone, athleteQueue: coach ? [] : queue, coachQueue: coach ? queue : [] };
      });
    },
    async sharing(actor: Actor) {
      return withTransaction(db, async tx => {
        if (await role(tx, actor) !== "ATHLETE") deny();
        const evidence = await tx.gate1Evidence.findMany({ where: { athleteId: actor.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 50,
          select: { id: true, filmId: true, teamId: true, film: { select: { title: true } } } });
        const teams = await tx.teamMembership.findMany({ where: { userId: actor.id, teamRole: "ATHLETE" }, select: { teamId: true } });
        const contacts = await tx.teamMembership.findMany({ where: { teamId: { in: teams.map(t => t.teamId) }, user: { role: { in: ["PARENT", "TRAINER", "RECRUITER"] } } },
          select: { teamId: true, user: { select: { id: true, name: true, role: true } } } });
        const grants = await tx.consentGrant.findMany({ where: { athleteId: actor.id, resourceType: "EVIDENCE", revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, granteeId: true, resourceId: true, expiresAt: true, grantee: { select: { name: true } }, permittedActions: true } });
        return { evidence: evidence.map(e => ({ id: e.id, filmId: e.filmId, teamId: e.teamId, title: e.film.title })), contacts, grants };
      });
    },
    async grant(actor: Actor, raw: unknown) {
      const input = parse(grantSchema, raw);
      return withTransaction(db, async tx => {
        if (actor.id !== input.athleteId || await role(tx, actor) !== "ATHLETE" || !(await athleteInTeam(tx, actor.id, input.teamId))) deny();
        if (input.expiresAt <= new Date()) invalid("EXPIRED_GRANT");
        const grantee = await tx.user.findUnique({ where: { id: input.granteeId } });
        if (!grantee || !["PARENT", "TRAINER", "RECRUITER"].includes(grantee.role)) deny();
        if (grantee.role === "PARENT" && input.resourceType !== "EVIDENCE") deny();
        const ctx = await resourceContext(tx, input.resourceType, input.resourceId, input.teamId);
        if (ctx.athleteId !== input.athleteId || ctx.teamId !== input.teamId) invalid("GRANT_CONTEXT");
        for (const action of input.permittedActions) {
          if (action === "PLAY_MEDIA" && input.resourceType !== "EVIDENCE") invalid();
          if (action === "UPLOAD_EVIDENCE" && (grantee.role !== "TRAINER" || input.resourceType !== "ATHLETE")) deny();
          if (action === "CREATE_OBSERVATION" && (grantee.role !== "TRAINER" || input.resourceType !== "EVIDENCE")) deny();
          if (action === "EDIT_OBSERVATION" && (grantee.role !== "TRAINER" || input.resourceType !== "OBSERVATION" || ctx.authorId !== grantee.id)) deny();
          if (action === "READ" && input.resourceType === "ATHLETE") invalid();
        }
        return tx.consentGrant.create({ data: { ...input, grantedById: actor.id } });
      });
    },
    async revoke(actor: Actor, grantId: string) {
      return withTransaction(db, async tx => {
        const g = await tx.consentGrant.findUnique({ where: { id: grantId } });
        if (!g || g.athleteId !== actor.id || await role(tx, actor) !== "ATHLETE") return deny();
        return tx.consentGrant.update({ where: { id: g.id }, data: { revokedAt: g.revokedAt ?? new Date() } });
      });
    },
  };
}
async function authorizeUpload(tx: Tx, actor: Actor, input: z.infer<typeof uploadSchema>) {
  if (!(await athleteInTeam(tx, input.athleteId, input.teamId))) deny();
  const own = actor.id === input.athleteId && await role(tx, actor) === "ATHLETE";
  if (!own && !(await isCoach(tx, actor, input.athleteId, input.teamId)) && !(await role(tx, actor) === "TRAINER" && await hasGrant(tx, actor, input, "ATHLETE", input.athleteId, "UPLOAD_EVIDENCE"))) deny();
  const p = await tx.protocolVersion.findUnique({ where: { id: input.protocolVersionId }, include: { exercise: true } });
  const team = await tx.team.findUnique({ where: { id: input.teamId } });
  if (!p || p.exercise.teamId !== input.teamId || !p.sport || p.sport !== team?.sport) invalid("PROTOCOL_CONTEXT");
}
async function resourceContext(tx: Tx, type: Gate1Resource, resourceId: string, teamId: string): Promise<{ athleteId: string; teamId: string; authorId?: string }> {
  if (type === "ATHLETE") return { athleteId: resourceId, teamId };
  if (type === "EVIDENCE") return evidence(tx, resourceId);
  if (type === "OBSERVATION") { const o = await tx.gate1Observation.findUnique({ where: { id: resourceId }, include: { evidence: true } }); if (!o) return deny(); return { ...o.evidence, authorId: o.authorId }; }
  if (type === "ASSIGNMENT") { const a = await tx.actionAssignment.findUnique({ where: { id: resourceId } }); if (!a) return deny(); return a; }
  const s = await tx.assignmentSubmission.findUnique({ where: { id: resourceId }, include: { assignment: true } }); if (!s) return deny(); return s.assignment;
}
