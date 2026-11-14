# Gate 1 backend contract

Implementation baseline: `feat/next-move-onyx-integration`. This adds a dedicated evidence → observation → assignment → acceptance → submission → review loop alongside the existing NextMoveRecommendation engine. No UI or production migration is included.

## Scope and decisions

- Existing CUID identities and User, TeamMembership, Film, Clip and Exercise models are reused. Gate1Evidence identifies the athlete separately from Film.uploadedById: a trainer uploading for an athlete does not become the evidence owner.
- Gate 1 assignments require a team, current athlete membership, verified COACH membership and COACH account role. There is no independent-coach shortcut. Existing provider verification only verifies trainers/doctors; a trusted operator must provision verified coach memberships for the pilot. Joining with a code never verifies a coach. Hybrid athlete/coach account roles are not yet supported by this contract.
- ProtocolVersion, original evidence, submissions, reviews and state history are immutable. Assignment protocol, baseline, observation and due date remain pinned. To correct a pinned observation, create another observation. The original baseline is compared with the reviewed submission, rather than accepting an arbitrary baseline submission ID from the client.
- The only transitions are ASSIGNED → ACCEPTED → SUBMITTED → NEEDS_REVISION → SUBMITTED, or SUBMITTED → CLOSED. Closure requires explicit COMPARABLE assessment and notes. This records a coach's assessment, not a physiological measurement or proof of improvement.
- Serialization retries, expectedVersion guards and actor-scoped operation keys protect mutations. Retrying a committed identical request returns its original transition receipt. Changed payload with the same key returns 409. Stale versions return 409. Authorization is checked again even when replaying a receipt.
- Database constraints enforce context, lifecycle, unique review per submission, matching history and immutable rows. They do not authenticate end users. Application sessions/services remain the authorization boundary. Runtime credentials must not own tables, be superuser, bypass protections or have DDL/TRUNCATE privileges. Migrator credentials must be separate.

## API

All routes are under `/api/gate1`. Mutations require an exact same-origin Origin header and an application session. Actor identity is never accepted from JSON. Athlete IDs in assignment/upload/grant payloads identify the target, not the actor. Unknown JSON properties are rejected. Errors use typed codes: 401 unauthenticated, 404 unavailable/unauthorized resource, 409 conflict, 422 domain validation. Responses are uncached.

| Method | Path | Purpose |
|---|---|---|
| POST | /protocols | Verified coach creates protocol snapshot |
| POST | /evidence | Multipart video upload, server inspection and private storage |
| POST / PATCH | /observations / /observations/:id | Coach or explicitly scoped trainer observation |
| POST | /assignments | Coach assigns with pinned baseline and protocol |
| POST | /accept | Athlete accepts; assignmentId, expectedVersion, operationKey |
| POST | /submit | Athlete submits; acceptance fields plus evidenceId, optional athleteNotes |
| POST | /review | Coach decides; transition fields plus submissionId, decision, feedbackNote, comparability and comparabilityNotes |
| GET | /evidence/:id, /observations/:id, /assignments/:id, /submissions/:id | Independently authorized reads, no implicit nested-resource grant |
| GET | /playback/:filmId | Session-protected playback path; not a signed bearer URL |
| GET | /today?timeZone=America/Chicago | Deterministic athlete/coach queues; UTC when omitted |
| POST / DELETE | /grants / /grants/:id | Athlete creates exact resource/action grants or revokes them |

Parent grants permit evidence metadata/playback only. Trainer mutation requires the precise upload/create/edit action; upload authority does not imply playback. Recruiter grants are read/playback only. No broad legacy recruiting or team-share permission overrides Gate 1. A READ grant alone never permits PLAY_MEDIA. Legacy film listings exclude Gate 1; legacy detail and mutation helpers deny it.

Today excludes submitted/closed athlete tasks; coaches see pending reviews and overdue follow-up. Revision, overdue, due-today, acceptance and upcoming reasons use deterministic scores, then deadline and assignment ID. There is one card per assignment. This does not merge separate assignments based on similar text. Timezone is an explicit IANA parameter, not server-local time. Account roles and current team memberships scope both queues.

## Media and revocation

Uploads use the existing storage abstraction and private film records. The server runs ffprobe against actual bytes and records a SHA-256 digest. Recorded date and capture conditions remain user reports; positive video duration does not establish camera calibration or biomechanical accuracy. Reusing the exact baseline bytes as a retest is rejected; the hash is not an anti-cheating guarantee.

`ffprobe` must be available in the deployed Node runtime, optionally via FFPROBE_PATH. Missing inspector fails closed with 503. Multipart upload has a 50 MiB application cap (and any lower hosting limit still applies). This is a buffered small-clip path; larger/resumable uploads and storage quota reservation are not implemented. A deployment with a lower request-body limit must use appropriately small clips until a validated upload pipeline is added.

The existing `/api/films/:id/video` proxy checks Gate 1 authorization on **every GET/range request**, before storage reads, and uses private/no-store. Revocation blocks subsequent requests. It cannot retract bytes already delivered or stop an already-authorized in-flight response. Private object storage must not also expose public URLs. No signed-URL mock is presented as proof of token invalidation.

## Verification and rollout

`npm run test:gate1` requires GATE1_TEST_DATABASE_URL pointing to a dedicated database whose name contains `test`. The suite rejects table-owner/superuser credentials. Apply migrations with a separate migrator, then grant the test runtime SELECT/INSERT/UPDATE/DELETE and sequence usage. Do not run tests on production. Fixtures use unique IDs and are retained because history is immutable; dispose of the entire isolated test database after the run.

The GitHub workflow provisions PostgreSQL 16 with separate migrator/runtime roles. Local validation uses real PostgreSQL 18, not SQLite or a mocked database. Storage bytes and the session resolver are mocked only in HTTP-boundary tests; Prisma and authorization run against PostgreSQL. Video inspection has a real ffmpeg/ffprobe test.

Before Gate 1 is declared verified: run these checks against an isolated Neon branch with deployed runtime configuration; verify actual application-session login, real private object storage and iPhone upload/playback end to end; establish trusted coach verification, retention/deletion procedures and deployment migration review. No production/Neon migration or iPhone UI verification has been performed by this change. Immutable history intentionally blocks cascading account deletion; a separate authorized retention/pseudonymization process must precede production launch.
