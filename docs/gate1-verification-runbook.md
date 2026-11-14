# PR #30 verification runbook

Gate 1 remains unsigned. Do not merge or start Gate 2 based on a green build alone.

## Current evidence

Original implementation commit: c97c8f00d7c6de6de819bba681824f2df10ccdd4.
- Local PostgreSQL 18: 29 tests passed; TypeScript and targeted lint passed.
- GitHub Gate 1 backend run 43560942088: passed on PostgreSQL 16.
- Vercel built a preview automatically. A ready preview is not proof that its database has the migration, storage works, or the app is usable.
- Project environment metadata currently lists DATABASE_URL and DATABASE_URL_POOLED for both production and preview, with no branch-specific override. Do not run verification against that inherited configuration.
- Neon branch creation and live execution: not performed; Neon connection required.
- Physical iPhone and Gate 1 UI: not verified. PR #30 adds APIs, not an integrated coaching UI. The current UI cannot be signed off with the proposed mobile checklist.

## 1. Establish isolation first

Use a verified Neon project ID and explicit parent branch ID; do not assume the production default named main matches the integration baseline. Capture the returned branch ID for cleanup. Name the branch pr-30-gate1-verify. Prefer a sanitized test baseline. Normal branches copy parent data as well as schema; schema-only branches omit data but require care with Prisma migration history. Never baseline an unverified schema as applied.

Within that branch create a fresh dedicated database named menta_gate1_test. Apply this repository's migration chain there; this avoids inheriting unknown schema drift or a schema-only copy with an empty _prisma_migrations history. Use synthetic athletes and separate non-owner application and migrator roles. If migration compatibility with existing data is also required, test that separately on a sanitized baseline copy and record the source migration history; a fresh-database test alone does not prove populated-database upgrade compatibility.

Use the Neon connection flow/CLI for the actual returned branch, database and role. Do not paste connection strings into PR comments or chat. Confirm the two hostnames identify that new branch's compute (pooled hostname differs by the pooler suffix), the database is menta_gate1_test, and neither runtime role owns tables nor has privileged role memberships.

MENTA's schema uses these names, which differ from common Prisma examples:

| Variable | Meaning |
|---|---|
| DATABASE_URL | Direct connection, used by Prisma directUrl for migrations |
| DATABASE_URL_POOLED | Pooled connection, used by Prisma runtime |
| GATE1_TEST_DATABASE_URL | Explicit test-runtime connection, restricted role |
| DIRECT_URL | Unused by this repository |

Inject credentials through secure environment configuration. After verifying the target:

```sh
npm ci
npx prisma migrate deploy
npx prisma generate
npm run test:gate1
npx next typegen
npx tsc --noEmit
```

Run migrate deploy with migrator credentials; the suite connects using GATE1_TEST_DATABASE_URL. Run once with the restricted direct connection and once with its pooled equivalent to verify the deployed connection mode. The suite refuses a database name without test and refuses superuser/table-owner test accounts. Install ffmpeg/ffprobe for the real media inspection test. Do not substitute bare `npx vitest run`, which does not explicitly select the Gate 1 config.

## 2. Database checks must fail closed

The integration suite seeds its own fixture rows, verifies their existence and exercises raw SQL. Run with a restricted application role, not the migration owner.

- AssignmentStateHistory and AssignmentReview UPDATE and DELETE must fail with SQLSTATE 23001 from the immutable-row trigger.
- TRUNCATE must fail with SQLSTATE 42501 for the restricted runtime account.
- Updating a registered Gate1Evidence film's durationSec must fail with SQLSTATE 23001. The protection is stronger than clip-bound checks: the registered source film is immutable.
- Raw state changes without their history entry must fail and leave the assignment unchanged.
- Check workflow state, history count and review count after failed/concurrent transactions.

Do not use arbitrary LIMIT 1 records or silently skip empty tables. Do not catch a generic raise_exception around a test that also raises its own FAIL exception: that catches the failure and prints a false PASS. Exact SQLSTATE assertions distinguish trigger enforcement from syntax errors, missing columns or permission errors. In this schema the fields are Film.durationSec and Clip.endSec, not durationSeconds/endTimeSec.

## 3. Preview prerequisites

Configure only the PR branch preview scope with the isolated runtime database URLs, an isolated session secret and private test storage. Use a dedicated test bucket/prefix and disable outbound email integrations for synthetic users. Verify ffprobe is present in the deployed runtime; inspection must fail closed if absent. Respect the hosting request-body limit, which can be lower than the application's 50 MiB cap. A 10–15 second HEVC file is not guaranteed to fit.

No automatic migration belongs in a shared preview build. Apply migrations only after explicit target verification. Redeploy the branch after environment changes. Recheck the exact commit SHA and runtime environment, rather than relying on an earlier preview's Ready status.

## 4. Real-session and physical iPhone acceptance

First run authenticated API smoke tests against the isolated preview with synthetic users and actual storage. Record status codes and row IDs without cookies/tokens. Then implement/connect the minimal Gate 1 mobile UI and complete this physical-device checklist. Browser emulation is useful but does not replace Safari on a real iPhone.

| Check | Expected evidence | Status |
|---|---|---|
| MOV/HEVC baseline and retest upload | Actual bytes inspected; durationSec and digest stored; capture time remains labeled user-reported | Not run |
| Coach clip scrubbing | Safari seeks; valid Range returns 206; clip range cannot exceed durationSec | Not run |
| Assign → accept → submit → revision → resubmit → close | Same baseline/protocol throughout; six ordered history rows; latest submission reviewed | Not run |
| Today queues | Correct actor/team, timezone and action; submitted athlete tasks removed; coach review appears | UI not implemented |
| Unauthorized media | GET /api/gate1/playback/:filmId and /api/films/:filmId/video return 404 for authenticated unauthorized actors; unauthenticated requests return 401 | Device not run |
| Explicit grant/revoke | Resource type EVIDENCE with evidence ID and PLAY_MEDIA; next GET/range denied after revoke | Device not run |
| Airplane Mode recovery | Recoverable UI error; retry submission with same operationKey/payload returns original receipt; exactly one submission | UI not implemented |

Playback is a session-protected proxy, not a signed URL. Revocation cannot erase bytes already buffered or stop an already-authorized in-flight response. Upload retries can create separate evidence records; assignment submission idempotency does not imply resumable/idempotent uploads. Record these as distinct checks.

## 5. Sign-off and cleanup

Record commit SHA, Neon branch/database/role, migration status, direct/pooled test results, CI results, preview SHA, device/iOS/Safari version, file codec/size, and each observed pass/fail. Never store credentials in the sign-off record. All required checks must pass; absent access, empty fixtures, missing UI or untested hardware are BLOCKED/NOT RUN, not PASS.

After sign-off and approval: detach/delete the PR-specific preview environment overrides and test storage objects, retire the verification deployment, then delete only the recorded ephemeral Neon branch ID. Do not leave a live preview pointing at a deleted database or falling back to shared credentials. Keep sanitized logs and the sign-off record. Do not delete the branch while QA is unfinished.

References: Neon branching documentation https://neon.com/docs/manage/branches and connection-string documentation https://neon.com/docs/reference/cli-connection-string. Exact CLI flags should be checked against the installed version before execution.
