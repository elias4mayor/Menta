import { randomUUID, createHash } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PrismaClient, type User, type Team, type Gate1Evidence, type ProtocolVersion, type Gate1Observation } from '@prisma/client';
import { gate1Service } from '../../src/lib/gate1/service';
import { urgency, compareToday } from '../../src/lib/gate1/today';
const url = process.env.GATE1_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.includes('test')) throw new Error('Set GATE1_TEST_DATABASE_URL to a dedicated test database. Never production.');
const db = new PrismaClient({ datasourceUrl: url });
const svc = gate1Service(db);
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/storage', async importOriginal => {
  const original = await importOriginal<typeof import('../../src/lib/storage')>();
  const { Readable } = await import('node:stream');
  return { ...original, readFileRange: vi.fn(async () => ({ stream: Readable.from(Buffer.from('test')) })) };
});
const key = () => randomUUID();
let athlete: User, coach: User, outsider: User, parent: User, trainer: User, recruiter: User, unverified: User;
let team: Team, otherTeam: Team, protocol: ProtocolVersion, baseline: Gate1Evidence, followup: Gate1Evidence, observation: Gate1Observation;
async function upload(actor = athlete, recordedAt = new Date('2026-01-02T12:00Z')) {
  return svc.registerInspectedUpload(actor, { athleteId: athlete.id, teamId: team.id, protocolVersionId: protocol.id, title: 'Release test', recordedAt, captureNotes: 'Fixed tripod, same surface', recordingRightsConfirmed: true }, { storageKey: `test/${key()}.mp4`, mimeType: 'video/mp4', originalFilename: 'clip.mp4', sizeBytes: 100, durationSec: 10, sha256: createHash('sha256').update(key()).digest('hex') });
}
function creation() { return { athleteId: athlete.id, teamId: team.id, observationId: observation.id, protocolVersionId: protocol.id, baselineEvidenceId: baseline.id, customCue: 'Keep pad level low', successCriterion: 'Three clean reps', dueAt: new Date('2030-01-01T12:00Z'), operationKey: key() }; }
async function accepted() { const a = await svc.create(coach, creation()); return svc.accept(athlete, { assignmentId: a.assignmentId, expectedVersion: 1, operationKey: key() }); }
async function submitted() { const a = await accepted(); return svc.submit(athlete, { assignmentId: a.assignmentId, expectedVersion: 2, operationKey: key(), evidenceId: followup.id }); }
function reviewInput(a: Awaited<ReturnType<typeof submitted>>, decision: 'CLOSED' | 'NEEDS_REVISION' = 'CLOSED') { return { assignmentId: a.assignmentId, submissionId: a.submissionId!, expectedVersion: a.version, operationKey: key(), decision, feedbackNote: 'Reviewed every rep', comparability: 'COMPARABLE', comparabilityNotes: 'Same angle and protocol' }; }
async function grant(user: User, actions: ('READ' | 'PLAY_MEDIA')[] = ['PLAY_MEDIA']) { return svc.grant(athlete, { athleteId: athlete.id, teamId: team.id, granteeId: user.id, resourceType: 'EVIDENCE', resourceId: baseline.id, permittedActions: actions, expiresAt: new Date(Date.now() + 3600000) }); }
beforeAll(async () => {
  const [runtime] = await db.$queryRaw<{ rolsuper: boolean; owns_table: boolean }[]>`SELECT r.rolsuper, EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tableowner=current_user) AS owns_table FROM pg_roles r WHERE rolname=current_user`;
  if (runtime.rolsuper || runtime.owns_table) throw new Error('Run tests with a non-owner, non-superuser application role.');
  const users = await Promise.all(['ATHLETE', 'COACH', 'COACH', 'PARENT', 'TRAINER', 'RECRUITER', 'COACH'].map(role => db.user.create({ data: { email: `${key()}@gate1.test`, name: role, role } })));
  [athlete, coach, outsider, parent, trainer, recruiter, unverified] = users;
  team = await db.team.create({ data: { name: 'Alpha', sport: 'Football', inviteCode: key(), createdById: coach.id } });
  otherTeam = await db.team.create({ data: { name: 'Bravo', sport: 'Football', inviteCode: key(), createdById: outsider.id } });
  await db.teamMembership.createMany({ data: [athlete, coach, parent, unverified].map(u => ({ userId: u.id, teamId: team.id, teamRole: u.role, verifiedAt: u.id === unverified.id ? null : new Date() })).concat([{ userId: outsider.id, teamId: otherTeam.id, teamRole: 'COACH', verifiedAt: new Date() }]) });
  const exercise = await db.exercise.create({ data: { name: 'Split release', category: 'Footwork', sport: 'Football', teamId: team.id, createdById: coach.id } });
  protocol = await svc.createProtocol(coach, { teamId: team.id, exerciseId: exercise.id, versionNumber: 1, instructions: 'Three releases', cameraSetupNotes: 'Fixed tripod', successRubric: 'Three clean reps' });
  baseline = await upload(athlete, new Date('2026-01-01T12:00Z'));
  followup = await upload();
  observation = await svc.observe(coach, { evidenceId: baseline.id, startSec: 0, endSec: 3, observationNote: 'First step crosses midline' });
});
afterAll(async () => { await db.$disconnect(); });
describe('Gate 1 real PostgreSQL workflow', () => {
  it('completes assign, accept, submit, revision, resubmit, comparable close atomically', async () => {
    const first = await submitted();
    const revised = await svc.review(coach, reviewInput(first, 'NEEDS_REVISION'));
    const second = await svc.submit(athlete, { assignmentId: first.assignmentId, expectedVersion: revised.version, operationKey: key(), evidenceId: (await upload()).id });
    const closed = await svc.review(coach, reviewInput(second));
    expect(closed.status).toBe('CLOSED'); expect(closed.version).toBe(6);
    const history = await db.assignmentStateHistory.findMany({ where: { assignmentId: first.assignmentId }, orderBy: { version: 'asc' } });
    expect(history.map(h => h.newState)).toEqual(['ASSIGNED', 'ACCEPTED', 'SUBMITTED', 'NEEDS_REVISION', 'SUBMITTED', 'CLOSED']);
    expect(await db.assignmentSubmission.count({ where: { assignmentId: first.assignmentId } })).toBe(2);
  });
  it('denies unverified and cross-team coaches and leaves no assignment', async () => {
    const input = creation();
    for (const actor of [unverified, outsider, athlete, trainer]) await expect(svc.create(actor, input)).rejects.toMatchObject({ status: 404 });
    expect(await db.assignmentStateHistory.count({ where: { operationKey: input.operationKey } })).toBe(0);
  });
  it('does not allow omitted team context or caller-supplied coach identity', async () => {
    const input = creation();
    await expect(svc.create(athlete, { ...input, coachId: coach.id })).rejects.toMatchObject({ status: 422 });
    await expect(svc.create(coach, { ...input, teamId: undefined })).rejects.toMatchObject({ status: 422 });
  });
  it('rejects mismatched protocol and observation before writing history', async () => {
    await expect(svc.create(coach, { ...creation(), baselineEvidenceId: followup.id })).rejects.toMatchObject({ code: 'EVIDENCE_CONTEXT' });
    await expect(svc.create(coach, { ...creation(), protocolVersionId: key() })).rejects.toMatchObject({ code: 'EVIDENCE_CONTEXT' });
  });
  it('cannot skip acceptance or self-review', async () => {
    const a = await svc.create(coach, creation());
    await expect(svc.submit(athlete, { assignmentId: a.assignmentId, expectedVersion: 1, operationKey: key(), evidenceId: followup.id })).rejects.toMatchObject({ status: 409 });
    const s = await submitted(); await expect(svc.review(athlete, reviewInput(s))).rejects.toMatchObject({ status: 404 });
  });
  it('requires a comparable review to close and rolls back on rejection', async () => {
    const s = await submitted();
    await expect(svc.review(coach, { ...reviewInput(s), comparability: 'NOT_COMPARABLE' })).rejects.toMatchObject({ status: 422 });
    expect(await db.assignmentReview.count({ where: { submissionId: s.submissionId! } })).toBe(0);
    expect((await db.actionAssignment.findUniqueOrThrow({ where: { id: s.assignmentId } })).version).toBe(3);
  });
  it('allows exactly one concurrent submission with no orphan attempt/history', async () => {
    const a = await accepted();
    const results = await Promise.allSettled([1, 2].map(() => svc.submit(athlete, { assignmentId: a.assignmentId, expectedVersion: 2, operationKey: key(), evidenceId: followup.id })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect(await db.assignmentSubmission.count({ where: { assignmentId: a.assignmentId } })).toBe(1);
    expect(await db.assignmentStateHistory.count({ where: { assignmentId: a.assignmentId } })).toBe(3);
  });
  it('replays identical request receipts and rejects reused keys with changed payload', async () => {
    const a = await accepted(); const input = { assignmentId: a.assignmentId, expectedVersion: 2, operationKey: key(), evidenceId: followup.id };
    const first = await svc.submit(athlete, input); expect(await svc.submit(athlete, input)).toEqual(first);
    await expect(svc.submit(athlete, { ...input, athleteNotes: 'changed' })).rejects.toMatchObject({ status: 409 });
  });
  it('rejects stale versions and concurrent conflicting reviews', async () => {
    const s = await submitted();
    await expect(svc.review(coach, { ...reviewInput(s), expectedVersion: 2 })).rejects.toMatchObject({ status: 409 });
    const results = await Promise.allSettled([svc.review(coach, reviewInput(s)), svc.review(coach, reviewInput(s, 'NEEDS_REVISION'))]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.assignmentReview.count({ where: { submissionId: s.submissionId! } })).toBe(1);
  });
  it('blocks raw audit UPDATE, DELETE, TRUNCATE and protocol mutation', async () => {
    const s = await submitted(); const r = await svc.review(coach, reviewInput(s));
    for (const table of ['AssignmentStateHistory', 'AssignmentReview']) {
      const id = table === 'AssignmentReview' ? r.reviewId : (await db.assignmentStateHistory.findFirstOrThrow({ where: { assignmentId: s.assignmentId } })).id;
      await expect(db.$executeRawUnsafe(`UPDATE "${table}" SET id=id WHERE id=$1`, id)).rejects.toThrow();
      await expect(db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id=$1`, id)).rejects.toThrow();
      await expect(db.$executeRawUnsafe(`TRUNCATE "${table}" CASCADE`)).rejects.toThrow();
    }
    await expect(db.protocolVersion.update({ where: { id: protocol.id }, data: { instructions: 'changed' } })).rejects.toThrow();
  });
  it('blocks raw state changes without a matching history receipt', async () => {
    const a = await svc.create(coach, creation());
    await expect(db.actionAssignment.update({ where: { id: a.assignmentId }, data: { status: 'ACCEPTED', version: 2 } })).rejects.toThrow();
    expect((await db.actionAssignment.findUniqueOrThrow({ where: { id: a.assignmentId } })).version).toBe(1);
  });
  it('validates clip bounds and prevents film-duration or pinned-observation edits', async () => {
    await expect(svc.observe(coach, { evidenceId: baseline.id, startSec: 1, endSec: 11, observationNote: 'invalid' })).rejects.toMatchObject({ status: 422 });
    await expect(db.film.update({ where: { id: baseline.filmId }, data: { durationSec: 1 } })).rejects.toThrow();
    await svc.create(coach, creation());
    await expect(svc.editObservation(coach, observation.id, { observationNote: 'changed' })).rejects.toMatchObject({ status: 409 });
  });
});
describe('M11 media and read boundaries', () => {
  it('allows athlete subject and verified scoped coach', async () => {
    expect((await svc.playback(athlete, baseline.filmId)).storageKey).toBeTruthy();
    expect((await svc.playback(coach, baseline.filmId)).storageKey).toBeTruthy();
  });
  it('denies parent membership, unverified coach, outsider and ungranted trainer', async () => {
    for (const actor of [parent, unverified, outsider, trainer, recruiter]) await expect(svc.playback(actor, baseline.filmId)).rejects.toMatchObject({ status: 404 });
  });
  it('READ grant does not imply PLAY_MEDIA even for exact evidence', async () => {
    const g = await grant(parent, ['READ']);
    expect((await svc.readEvidence(parent, baseline.id)).id).toBe(baseline.id);
    await expect(svc.playback(parent, baseline.filmId)).rejects.toMatchObject({ status: 404 });
    await svc.revoke(athlete, g.id);
  });
  it('resource grant permits playback only until revoked and never another film', async () => {
    const g = await grant(recruiter);
    await expect(svc.playback(recruiter, baseline.filmId)).resolves.toHaveProperty('storageKey');
    await expect(svc.playback(recruiter, followup.filmId)).rejects.toMatchObject({ status: 404 });
    await svc.revoke(athlete, g.id);
    await expect(svc.playback(recruiter, baseline.filmId)).rejects.toMatchObject({ status: 404 });
  });
  it('rejects expired grants without scheduled cleanup', async () => {
    const g = await grant(trainer);
    await db.consentGrant.update({ where: { id: g.id }, data: { grantedAt: new Date(Date.now() - 7200000), expiresAt: new Date(Date.now() - 3600000) } });
    await expect(svc.playback(trainer, baseline.filmId)).rejects.toMatchObject({ status: 404 });
  });
  it('revoked coach verification denies playback and review', async () => {
    const s = await submitted();
    await db.teamMembership.update({ where: { userId_teamId: { userId: coach.id, teamId: team.id } }, data: { verifiedAt: null } });
    try { await expect(svc.playback(coach, baseline.filmId)).rejects.toMatchObject({ status: 404 }); await expect(svc.review(coach, reviewInput(s))).rejects.toMatchObject({ status: 404 }); }
    finally { await db.teamMembership.update({ where: { userId_teamId: { userId: coach.id, teamId: team.id } }, data: { verifiedAt: new Date() } }); }
  });
  it('parent media grants never imply observation, assignment or submission reads', async () => {
    const s = await submitted(); const g = await grant(parent, ['READ', 'PLAY_MEDIA']);
    await expect(svc.readAssignment(parent, s.assignmentId)).rejects.toMatchObject({ status: 404 });
    await expect(svc.readObservation(parent, observation.id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.readSubmission(parent, s.submissionId!)).rejects.toMatchObject({ status: 404 });
    await svc.revoke(athlete, g.id);
  });
  it('trainer mutation requires an explicit action grant and never permits assignment', async () => {
    const g = await grant(trainer, ['READ']);
    await expect(svc.observe(trainer, { evidenceId: baseline.id, startSec: 0, endSec: 1, observationNote: 'note' })).rejects.toMatchObject({ status: 404 });
    await svc.revoke(athlete, g.id);
    const uploadGrant = await svc.grant(athlete, { athleteId: athlete.id, teamId: team.id, granteeId: trainer.id, resourceType: 'ATHLETE', resourceId: athlete.id, permittedActions: ['UPLOAD_EVIDENCE'], expiresAt: new Date(Date.now() + 3600000) });
    const delegated = await upload(trainer);
    await expect(svc.playback(trainer, delegated.filmId)).rejects.toMatchObject({ status: 404 });
    await expect(svc.playback(athlete, delegated.filmId)).resolves.toHaveProperty('storageKey');
    await svc.revoke(athlete, uploadGrant.id);
  });
  it('cross-team reads do not leak any workflow object', async () => {
    const s = await submitted();
    await expect(svc.readEvidence(outsider, baseline.id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.readObservation(outsider, observation.id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.readAssignment(outsider, s.assignmentId)).rejects.toMatchObject({ status: 404 });
    await expect(svc.readSubmission(outsider, s.submissionId!)).rejects.toMatchObject({ status: 404 });
  });
});
describe('M07 deterministic Today queues', () => {
  it('uses requested timezone at midnight and stable ordering', () => {
    const now = new Date('2026-11-14T05:30:00Z'); const due = new Date('2026-11-14T06:30:00Z');
    expect(urgency('ACCEPTED', due, now, 'UTC')?.urgencyReason).toBe('DUE_TODAY');
    expect(urgency('ACCEPTED', due, now, 'America/Chicago')?.urgencyReason).toBe('UPCOMING_DUE');
    expect(compareToday({ priorityScore: 10, dueAt: due, assignmentId: 'a' }, { priorityScore: 10, dueAt: due, assignmentId: 'b' })).toBe(-1);
  });
  it('excludes submitted athlete tasks, closed tasks, unverified and cross-team coaches', async () => {
    const s = await submitted();
    const athleteQueue = await svc.today(athlete, 'America/Chicago');
    expect(athleteQueue.athleteQueue.some(x => x.assignmentId === s.assignmentId)).toBe(false);
    expect(new Set(athleteQueue.athleteQueue.map(x => x.assignmentId)).size).toBe(athleteQueue.athleteQueue.length);
    expect((await svc.today(coach)).coachQueue.some(x => x.assignmentId === s.assignmentId && x.latestSubmissionId === s.submissionId)).toBe(true);
    expect((await svc.today(outsider)).coachQueue).toEqual([]);
    expect((await svc.today(unverified)).coachQueue).toEqual([]);
    await expect(svc.today(parent)).rejects.toMatchObject({ status: 404 });
    await expect(svc.today(athlete, 'invalid/timezone')).rejects.toMatchObject({ status: 422 });
  });
});
describe('HTTP session, media proxy and legacy boundaries', () => {
  it('requires a session, rejects forged actor fields and enforces same-origin mutations', async () => {
    const { getSessionUser } = await import('../../src/lib/session');
    const route = await import('../../src/app/api/gate1/[...path]/route');
    const params = { params: Promise.resolve({ path: ['assignments'] }) };
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await route.POST(new Request('https://menta.test/api/gate1/assignments', { method: 'POST' }), params)).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue({ id: athlete.id, name: athlete.name, email: athlete.email, role: 'ATHLETE' });
    const request = (body: unknown, origin = 'https://menta.test') => new Request('https://menta.test/api/gate1/assignments', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect((await route.POST(request({ ...creation(), coachId: coach.id }), params)).status).toBe(422);
    expect((await route.POST(request(creation()), params)).status).toBe(404);
    expect((await route.POST(request(creation(), 'https://attacker.test'), params)).status).toBe(403);
  });
  it('rechecks revocation on the next range request before reading storage', async () => {
    const { getSessionUser } = await import('../../src/lib/session');
    const { readFileRange } = await import('../../src/lib/storage');
    const { GET } = await import('../../src/app/api/films/[id]/video/route');
    vi.mocked(getSessionUser).mockResolvedValue({ id: recruiter.id, name: recruiter.name, email: recruiter.email, role: 'RECRUITER' });
    const g = await grant(recruiter); const params = { params: Promise.resolve({ id: baseline.filmId }) };
    const req = () => new Request(`https://menta.test/api/films/${baseline.filmId}/video`, { headers: { range: 'bytes=0-3' } });
    const allowed = await GET(req(), params); expect(allowed.status).toBe(206); expect(allowed.headers.get('cache-control')).toBe('private, no-store'); await allowed.arrayBuffer();
    const calls = vi.mocked(readFileRange).mock.calls.length;
    await svc.revoke(athlete, g.id);
    expect((await GET(req(), params)).status).toBe(404);
    expect(vi.mocked(readFileRange).mock.calls.length).toBe(calls);
  });
  it('revokes with an empty DELETE body', async () => {
    const { getSessionUser } = await import('../../src/lib/session');
    const { DELETE } = await import('../../src/app/api/gate1/[...path]/route');
    vi.mocked(getSessionUser).mockResolvedValue({ id: athlete.id, name: athlete.name, email: athlete.email, role: 'ATHLETE' });
    const g = await grant(parent);
    const response = await DELETE(new Request(`https://menta.test/api/gate1/grants/${g.id}`, { method: 'DELETE', headers: { origin: 'https://menta.test' } }), { params: Promise.resolve({ path: ['grants', g.id] }) });
    expect(response.status).toBe(200);
    await expect(svc.playback(parent, baseline.filmId)).rejects.toMatchObject({ status: 404 });
  });
  it('prevents legacy visibility and uploader shortcuts from bypassing Gate 1', async () => {
    const { canViewFilm, canManageFilm } = await import('../../src/lib/permissions');
    const { visibleFilmWhere } = await import('../../src/lib/film-visibility');
    const film = await db.film.findUniqueOrThrow({ where: { id: baseline.filmId } });
    const actor = { id: athlete.id, name: athlete.name, email: athlete.email, role: 'ATHLETE' as const };
    expect(await canViewFilm(actor, film)).toBe(false); expect(await canManageFilm(actor, film)).toBe(false);
    expect(await db.film.count({ where: { AND: [{ id: film.id }, await visibleFilmWhere(athlete.id)] } })).toBe(0);
  });
  it('blocks athlete self-verification through the existing provider endpoint', async () => {
    const { getSessionUser } = await import('../../src/lib/session');
    const { POST } = await import('../../src/app/api/team/verify-provider/route');
    vi.mocked(getSessionUser).mockResolvedValue({ id: athlete.id, name: athlete.name, email: athlete.email, role: 'ATHLETE' });
    const member = await db.teamMembership.findUniqueOrThrow({ where: { userId_teamId: { userId: athlete.id, teamId: team.id } } });
    expect((await POST(new Request('https://menta.test/api/team/verify-provider', { method: 'POST', body: JSON.stringify({ membershipId: member.id, teamRole: 'COACH', verifiedAt: new Date() }) }))).status).toBe(400);
    expect((await db.teamMembership.findUniqueOrThrow({ where: { id: member.id } })).teamRole).toBe('ATHLETE');
  });
});
