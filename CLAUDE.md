# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

MENTA — an AI-powered Athlete Operating System (Next.js 16 App Router + React 19 +
TypeScript + Prisma). This repo is the Phase 1/2 foundation described in
`MENTA-MASTER-BUILD-PLAN.md` (not committed here, but the source of truth for build
order, permissions, and legal/safety rules if it's ever handed to you). Read
`README.md` before making non-trivial changes — it documents exactly what's real vs.
`ComingSoon` stub, the security model, and the high-sensitivity-data rules for
Recovery/Mindset. Don't take README claims about "what's working" as stale — verify
against the code, but treat its *rules* (e.g. wellness data handling) as binding.

## Commands

```bash
npm run dev                      # Turbopack dev server, http://localhost:3000
npm run build                    # production build
npm run lint                     # eslint
npx tsc --noEmit                 # typecheck (no separate npm script)
npx prisma migrate dev           # apply/create migrations against prisma/dev.db
npx prisma studio                # inspect local SQLite data

npm run test:e2e                 # full Playwright suite (spins up npm run dev itself)
npx playwright test e2e/auth.spec.ts          # single file
npx playwright test -g "some test name"       # single test by name
```

E2E tests hit a **real** dev server and a **real** SQLite DB — nothing is mocked.
`e2e/fixtures.ts` drives actual signup → email-verify → onboarding through the UI,
reading the real 6-digit code from the server log (`playwright.config.ts` redirects
`npm run dev`'s stdout to `/tmp/menta-e2e-server.log`, since `RESEND_API_KEY` is
unset in dev and codes just print to console). `e2e/db-helpers.ts` mints real,
DB-backed sessions directly for API-level tests and cleans up only rows tagged with
its own `E2E_RUN_ID` (the dev DB has years of unrelated leftover test rows — never
sweep by email domain alone). First cold request per route is slow under Turbopack
dev mode (that's why the Playwright timeout is 90s, not the default) — expect that
when running/debugging tests locally, it's not a hang.

## Architecture

**Data model is one Prisma schema, backed by PostgreSQL in every environment**
(local/staging/production each get their own database — see `DATABASE_URL` in
`.env.example`). The schema deliberately avoids native enum types (role/status/
category/visibility fields are plain `String`, with allowed values documented in a
`///` comment above each model and enforced in `src/lib/permissions.ts` /
`src/lib/validation.ts`, never by the DB) — a holdover from when dev ran on SQLite
and Postgres was swapped in only for deployment; kept because it's still true and
still useful (e.g. `mode: "insensitive"` string filters — the two free-text search
call sites, `src/app/api/geo/cities/route.ts` and `src/lib/exercises.ts` — use it
explicitly now, since Postgres's `contains`/`startsWith` are case-sensitive by
default, unlike SQLite's). Local Postgres: any local install works (Homebrew
`postgresql@16`, Postgres.app, or Docker) — `npx prisma migrate deploy` then the
seed scripts in prisma/ get a fresh database to the same state CI's does.

**Authorization is centralized, not per-route ad hoc.** `src/lib/permissions.ts` is
the single load-bearing authorization module — role checks, minor-status checks,
team-scoping, and MENTA Care provider-routing logic all live there. API route
handlers under `src/app/api/**/route.ts` are the actual enforcement boundary (every
mutation must check there, not just hide a button in the UI). `src/proxy.ts` (Next
16's renamed `middleware.ts`) does only a cheap optimistic cookie-presence redirect —
the real check is always a DB-backed session lookup via `requireUser()` /
`getSessionUser()` (`src/lib/auth-guards.ts`, `src/lib/session.ts`) inside the
page/route itself, per Next's own guidance against slow proxy-layer data fetching.
`src/proxy.ts` has since grown beyond that cheap-redirect description: it now does a
real DB-backed session lookup (checking `revokedAt`/`expiresAt`) plus email-verification
and onboarding-completion gating, not just cookie presence — see the file's own comment
for why (a stale-cookie redirect-loop bug). Page/route-level `requireUser()`/
`getSessionUser()` checks remain the actual enforcement boundary; don't rely on the
proxy layer alone.

**Auth is hand-rolled, not a SaaS.** bcrypt password hashing, opaque HMAC'd
DB-backed session tokens (`Session` table, revocable, not a bare forgeable JWT),
single-use hashed-at-rest password-reset and email-verification tokens. See
`src/lib/session.ts`, `src/lib/password.ts`, `src/lib/verification.ts`.

**Multi-sport: `AthleteSportContext` is the source of truth, not
`AthleteProfile.sport`/`.position`.** Those two fields on `AthleteProfile` are a
deprecated compatibility mirror, kept in sync inside the same transaction purely so
pre-multi-sport read sites keep working. New code should read/write
`AthleteSportContext` (via `src/lib/sport-context.ts`) — an athlete can have several,
exactly one `isPrimary` among the active ones, and Workout/PerformanceEntry/Goal/
RecruitingSchool/Film all optionally hang off a specific context. Don't add new
reads of `AthleteProfile.sport` directly.

**Role determines which profile model a user has.** `User.role` is one of the
`ROLES` in `src/lib/permissions.ts` (`ATHLETE`, `COACH`, `TRAINER`, `DOCTOR`,
`PARENT`, plus internal `SUPER_ADMIN`/`DEVELOPER`/`MENTA_STAFF`/`ORG_ADMIN`/
`SCHOOL_ADMIN`/`ATHLETIC_DIRECTOR`). Each non-staff role gets exactly one of
`AthleteProfile` / `CoachProfile` / `TrainerProfile` / `DoctorProfile` /
`ParentProfile` (1:1 on `userId`), each with its own onboarding component
(`src/components/*Onboarding.tsx`) and form (`src/components/*ProfileForm.tsx`).
Team membership (`TeamMembership.teamRole`) is a separate, coarser concept from
account `role` — don't conflate them.

**Sport vocabulary is registry-driven.** `src/lib/sports.ts` (`SPORTS`) is the only
place position/event lists and sport-specific copy live; `AthleteProfile.sport` /
`AthleteSportContext.sport` are free-text, not enums, so an unregistered sport falls
back to a generic "Other" config instead of breaking. Add a sport by adding an entry
here, not by hardcoding it into components.

**MENTA Film Center (`src/lib/position-groups.ts` + the `Film*`/`Position*` models)
is the largest subsystem.** `PositionGroup` is a coach-defined team subdivision
(free text, never an enum); `TeamPermissionGrant` layers fine-grained capabilities
(the `PERMISSIONS` list in `permissions.ts`) on top of the coarse `teamRole`,
optionally scoped to one group. Effective access must always be computed through
`src/lib/position-groups.ts` — never inferred from role name alone. Visibility on
`Film` itself has its own tier system (`PRIVATE` → `COACH_STAFF` → `POSITION_GROUP`
→ `TEAM` → `SELECTED_ATHLETES` → `RECRUITING` → `PUBLIC`); check
`src/lib/film-visibility.ts` before adding a new film read path. Video is served
through a Range-aware streaming route with the same permission check as the
metadata endpoint — never bypass that route to serve a file directly.

**MENTA AI is server-side only, provider-selectable, and context-scoped per
feature.** Entry point is `/api/ai` → `src/lib/ai.ts`, which builds a context object
from *only* the requesting user's own data (never another user's) and calls out to
a provider. `isAiConfigured()` picks the provider via `AI_PROVIDER` env
(`"gemini"` default, or `"anthropic"`) — Gemini goes through `src/lib/ai/gemini.ts`
(`GEMINI_API_KEY`), Anthropic through the `@anthropic-ai/sdk` client directly
(`ANTHROPIC_API_KEY`). With no key set for the active provider, the UI shows an
explicit "not connected" state — it never fabricates a reply. Academics' Study Help
(`src/app/api/academics/study-help`) shares the `AIConversation`/`AIMessage` tables
but is filtered by a separate `topic` value so it never collides with the general
coach's "most recent conversation" lookup. **`WellnessCheckIn` and `MindCheckIn`
(Recovery/Mindset) are deliberately never queried into any AI context** — treat that
as a hard rule, not an oversight, if you touch `buildAthleteContext()` or add a new
AI surface. See README's "Wellness data" / "Mental performance data" sections before
touching either feature.

**Working tree note:** `src/lib/ai.ts.backup`, `src/lib/ai.ts.before-gemini`, and
`mentagoogleclassroom.bundle` are untracked leftover files from recent work
(Gemini-provider migration, Google Classroom integration) — check `git status`
before assuming the tree is clean, and don't treat those files as canonical.

**Storage is Cloudflare R2 (S3-compatible) when configured, local disk otherwise.**
`src/lib/storage.ts` picks the provider automatically from whether
`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME` are all
set — same "real config present picks the real provider" pattern as
`AI_PROVIDER`/`RESEND_API_KEY`/`STRIPE_SECRET_KEY`. `isUploadStorageConfigured()`
gates all three upload routes (`/api/films`, `/api/documents`,
`/api/profile/avatar`) and refuses with an honest `503` outside
`NODE_ENV=development` when R2 isn't configured, rather than silently writing to
a serverless filesystem that won't still have the file on the next request. The
R2 bucket is never public and no presigned URLs are issued — every read still
goes through this app's own authenticated streaming routes
(`films/[id]/video`, `documents/[id]/file`, `users/[id]/avatar`), exactly as it
did with local disk; only *where the bytes live* changed, never who's allowed to
ask for them.

**Rate limiting is in-memory** (`src/lib/rate-limit.ts`), fixed-window, keyed by
`scope:ip`. Fine for a single instance; resets on redeploy and doesn't coordinate
across instances — swap for Redis/Upstash before running more than one instance.
`MENTA_E2E_DISABLE_RATE_LIMIT=1` (set only by `playwright.config.ts`'s `webServer`)
bypasses it so the e2e suite's rapid real signups don't self-trip the limiter.

**High-sensitivity data gets stricter rules than the rest of the app.**
`WellnessCheckIn` (Recovery) and `MindCheckIn` (Mindset) are private-by-default with
no sharing mechanism yet (not even to a coach or parent), never joined into
`AthleteProfile`/team rosters/search, never sent to an AI provider, and their route
handlers (`src/app/api/wellness/*`, `src/app/api/mind/*`) must never log request
body values to `logAudit()` or `console.log` — only record IDs. Don't extend either
feature's exposure without treating that as a deliberate, separately-designed change
per README.

**CareRequest's `reasonNote`/`providerNote` are similarly private** — medical
content that must never be selected into a coach- or parent-facing query (those
should select `status`/`scheduledStart` only; see the model's doc comment in
`prisma/schema.prisma` and the Care helpers in `permissions.ts`).

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL` (Postgres), `SESSION_SECRET`,
`APP_URL`. Everything else (AI provider keys, `RESEND_API_KEY`, OAuth client
ids/secrets, `TOKEN_ENCRYPTION_KEY` for Google Classroom, the `R2_*` object-storage
vars) is optional and each missing piece degrades to an honest "not connected"/
"not configured" UI state rather than fake behavior — that pattern (explicit
disabled state over silent fallback) is the house style; follow it for any new
optional integration. The one exception: uploads (`R2_*` unset) degrade to local
disk only in development — outside it they're honestly refused (`503`), never
silently written somewhere that won't survive the next request.
