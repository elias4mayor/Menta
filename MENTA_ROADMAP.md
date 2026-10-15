# MENTA Roadmap & Implementation Log

**Started:** 2026-10-14
**Purpose:** the founder-level mission is "build a category, not a feature
list." This file is the running record of what was decided and why, so a
future session (or a future me) doesn't have to re-derive it from the
commit log. Update it at the end of every increment — don't let it go
stale like `MENTA_AUDIT_REPORT.md` (last updated Aug 18, predates Position
Groups, Film Center, the Gemini migration, and everything below).

---

## The actual state of the product (2026-10-14 audit)

MENTA has a lot of genuinely real, well-isolated infrastructure: auth,
teams, messaging, calendar, Goals, Training, Performance, a full Film
Center (position groups with scoped permissions, 7 visibility tiers,
comments, telestration, playlists, assignments, review requests, coach
notes, analysis templates, scouting, cross-team film sharing), Academics
(terms, assignments, eligibility, Google Classroom sync), Recruiting
(schools, contacts, activity log), Recovery/Mindset (deliberately walled
off — private, never AI-fed, no synthesized scores), and Care
(athlete↔provider booking). ~90+ features, each one real, not a stub.
`README.md` is stale on this point — don't trust its "what's not live yet"
section without checking the code.

**The actual technical risk isn't missing features. It's that every one of
these modules only ever reads its own table.** The dashboard's
`TodaysPriorities` component reads *only* `Goal`. Nothing anywhere reads
across Film + Academics + Recruiting + Training + Goals for one athlete and
produces a single ranked judgment. An athlete can have an overdue film
assignment, a slipping eligibility item, and a recruiting list nobody's
touched in three weeks, and seven different cards would each show their own
narrow slice instead of one sentence: *this is what matters most right now,
and here's why.*

## The signature experience: the Next Move Engine

Not an "Athlete Twin" profile viewer (would just be a UI wrapper over data
that already exists per-page) and not an AI chatbot guessing at priorities.
A **deterministic, evidence-cited, cross-domain recommendation**, computed
fresh from the athlete's own real rows, with a persisted history so "did
this actually help" is answerable later instead of forgotten.

Why this is defensible and why it's the right first slice:
- It's the connective tissue competitors don't have an incentive to build —
  Hudl doesn't know your GPA, a recruiting CRM doesn't know your film
  assignments are overdue. MENTA already has both, in the same database.
- It's provably real in a live demo: show an athlete with real overdue data
  across two domains, show the engine pick the more urgent one with its
  actual numbers as evidence, resolve the underlying thing, watch the
  engine move on to the next real issue on its own.
- It respects the hard privacy boundary already documented in this repo —
  WellnessCheckIn/MindCheckIn are never read by it, same as
  `buildAthleteContext()` in `src/lib/ai.ts`.
- It's small. One new table, one library file, one route, one dashboard
  card. No new infra, no new dependency, no rewritten architecture.

## What's built (increment 1 — 2026-10-14)

- **Schema:** `NextMoveRecommendation` (additive migration
  `20261014193309_add_next_move_recommendation`) — persists what was
  recommended, when, and whether it resolved (condition cleared),
  superseded (still valid, got outranked), or was dismissed.
- **`src/lib/next-move.ts`** — `computeCandidates(userId)` runs 7 signal
  rules over Goal, Workout/WorkoutCompletion + the athlete's own stated
  `trainingDaysPerWeek`, PerformanceEntry, FilmAssignmentTarget, Assignment
  (academics), EligibilityChecklistItem, and RecruitingSchool/Activity.
  Every candidate carries a reasoning string built from real numbers and an
  `evidence` array of the exact fields that produced it — nothing
  fabricated, nothing from an LLM. `getNextMove(userId)` reconciles fresh
  candidates against the persisted ACTIVE row: auto-resolves it the moment
  its condition clears, supersedes it (without resolving) if something more
  urgent now outranks it, and only creates a new row when there's no
  current one. This is the Development Loop closing automatically.
- **`/api/next-move`** — `GET` returns the current recommendation + last 5
  resolved/dismissed; `POST {id, action:"dismiss"}` lets the athlete say
  "not now" (ownership-checked).
- **Dashboard** — `NextMoveCard` is now the first thing after the "Now"
  hero panel: title, plain-language reasoning, the evidence chips, a
  primary CTA straight to the relevant feature, and a honest "you're caught
  up" state when every signal is genuinely clear (never fakes one to fill
  the slot).

### Verified

- `npx tsc --noEmit`, `npx eslint src e2e`, `npm run build` — all clean.
- Live, multi-athlete API verification against the real dev DB (not a
  mock): an athlete with a 10-day-overdue assignment and a 1-day-overdue
  goal correctly got the assignment first (score reflects real severity);
  marking the assignment complete immediately resolved it and promoted the
  goal; a second athlete with zero data got their own honest "log your
  first performance stat" recommendation — no cross-athlete leakage.
- Caught and fixed a real bug during this verification: the reconciliation
  logic was overwriting an already-RESOLVED row back to SUPERSEDED on the
  same request. Rewrote it so resolve/supersede/create are mutually
  exclusive per call.
- Playwright: the two API-only specs (`sport-contexts-api.spec.ts`,
  `film-intelligence-security.spec.ts`, 15 tests) pass clean — no
  regression. The browser-driven specs could not run in this fresh
  container: `@playwright/test@1.62.1` (pinned in `package.json`) expects
  Chromium revision 1234; the container only has revision 1194
  pre-installed, with an incompatible internal directory layout (not a
  simple symlink fix — tried and confirmed). This is a pre-existing
  environment gap, not a regression from this change; didn't run
  `playwright install` per the no-network-fetch policy for this container.

### Honest gaps / what this is NOT yet

- Signals are rules, not learned from outcome data yet. The persisted
  history (`recentlyResolved`) exists specifically so a future pass can
  check whether athletes who acted on a given recommendation kind actually
  improved — that's real validation work, not assumed.
- Only 7 signal domains. Care, Safety, and team/coach-side signals
  (a coach's unread CoachNote backlog, open FilmReviewRequest queue) are
  natural next additions but weren't built this pass — scope control, not
  an oversight.
- No AI-generated phrasing layer. Reasoning strings are template-based by
  design (grounded, not optional-on-API-key). A future pass could use the
  configured AI provider to rephrase the *same* evidence more naturally,
  but must never let it add a claim the evidence doesn't support.
- The browser-based Playwright suite needs this container's Chromium
  revision mismatch fixed before it can run here (see above) — flagging so
  the next session doesn't waste time assuming it's a code regression.

## Increment 2: Coach Next Move — the connected, two-sided loop (2026-10-14)

**Checkpoint discipline:** before starting this increment, committed
increment 1 locally (commit `0858fa2`) as a clean baseline — diff
inspected, confirmed no secrets/generated artifacts/unrelated changes, not
pushed. This increment is a second local-only checkpoint on top of it,
same rules.

### Architecture decision: same engine, narrower authorization — not a second system

`computeCoachCandidates()` and `getCoachQueue()` live in the same
`src/lib/next-move.ts`, reuse `Candidate`/`EvidenceItem`/
`StoredRecommendation`, and persist into the same `NextMoveRecommendation`
table (one additive nullable column, `subjectAthleteId`, distinguishes "my
own recommendation" from "my coaching queue, about this athlete"). Nothing
in the athlete-side `computeCandidates()`/`getNextMove()`/`dismissNextMove()`
was touched — same functions, same behavior, re-verified passing.

**The deliberate scope cut, and why it's not an oversight:** the coach
signal set is two kinds (`FILM_ASSIGNMENT_OVERDUE`, `FILM_REVIEW_UNANSWERED`),
not the athlete's seven. `src/lib/permissions.ts` and `CoachDashboard.tsx`
(its own doc comment says so explicitly) grant a coach zero read access
today to `Goal`, `PerformanceEntry`, `Assignment` (academics),
`EligibilityChecklistItem`, or `RecruitingSchool`. Building those views is
real, separate, privacy-sensitive product work — a coach seeing an
athlete's specific overdue homework assignment or GPA is a genuinely
different decision than a coach seeing that a film they assigned is
unwatched. This engine does not quietly assume that decision has been
made. A live test (`coach queue ... never surfaces academic, recruiting,
goal, or performance signals`) asserts the private evidence strings never
appear in the coach-queue response at all, not just that they're filtered
from the "top" item.

Also deliberately excluded: Care. A coach can see *operational* care
status today (`canViewTeamCareStatus`), but only the assigned *provider*
can act on a care request (`canManageCareRequest`) — surfacing it as a
coach "next move" would imply an action the coach cannot actually take.

### What's built

- `COACH_ONLY_KINDS`, `CoachCandidate`, `computeCoachCandidates(coachUserId)`
  — queries only the coach's own `TeamMembership.teamRole IN (COACH, ADMIN)`
  teams (same coarse check `CoachDashboard.tsx` already uses — not a new
  authorization path), scores overdue film targets and open film-review
  questions with the athlete's name attached.
- `getCoachQueue(coachUserId)` — the list-shaped counterpart to
  `getNextMove()`: reconciles every candidate independently (resolves what
  cleared, persists what's new), returns a ranked queue instead of one
  slot, since "which of my athletes needs attention" is naturally a list.
- `/api/coach-queue` — GET queue + recent history, POST to dismiss (reuses
  `dismissNextMove` unchanged — it was already generic over `userId`).
- `CoachNextMoveQueue` — leads `CoachDashboard`, same visual language as
  the athlete's `NextMoveCard`: the single top item emphasized, the rest
  as a compact, dismissible list, an honest "your roster is caught up"
  state when it's genuinely empty.

### The live demonstration (scripts/seed-demo-scenario.mjs)

A real, runnable, clearly-labeled scenario (`@menta-demo.local` emails,
`[MENTA DEMO]` name prefix — `scripts/reset-demo-scenario.mjs` only ever
matches that domain, cannot touch real data): one coach, two athletes, one
team. The primary athlete has real competing signals across training,
film, academics, a goal, and recruiting — scored by the same formulas as
everything else, not hand-picked to "look right." The required film
assignment is the one signal that is simultaneously the athlete's own top
Next Move and the coach's top queue item.

**Verified live, through the real login → API path (not a mock):**
1. Jordan's Next Move: *"Watch Week 4 scrimmage — release points"*
   (`FILM_ASSIGNMENT_OVERDUE`, beating the overdue Chemistry assignment,
   the overdue goal, the training gap, and the stale recruiting
   follow-up on real scores).
2. The coach's queue, independently computed: the *same* item about
   Jordan, ranked above a lower-priority optional assignment for the
   second athlete and an open film question.
3. Jordan marks the film complete through the existing, already-shipped
   `/api/assignments/[id]/targets/me` endpoint (`AssignmentsList.tsx`'s
   own "Mark complete" button — no new UI needed for this step).
4. Both sides update on the next request, independently: Jordan's Next
   Move advances to the Chemistry assignment; the coach's queue drops the
   resolved item into history and promotes the next real priority.

This is the "show, don't tell" moment for investors: two different
people's screens, reflecting one underlying fact, changing together
because the data actually changed — not because either screen was told to
refresh.

### Tests added (`e2e/next-move-engine.spec.ts`, 7 tests, all passing)

Unauthenticated rejection (both routes) · deterministic ranking across
competing real signals · honest caught-up state with real (not absent)
data · auto-resolution and promotion on condition-clear · ownership-scoped
dismissal (own vs. another athlete's, 404 not 403, to avoid confirming the
row exists) · coach cross-team isolation · coach privacy boundary (the
excluded-domain assertion above) · required-vs-optional film ranking ·
directed-vs-open film-question ranking · a coach with no teams getting an
empty (not fabricated) queue.

**Full suite after this increment: 22/22 passing**
(`e2e/next-move-engine.spec.ts` + `e2e/sport-contexts-api.spec.ts` +
`e2e/film-intelligence-security.spec.ts`), `tsc`/`eslint`/`npm run build`
all clean. Browser-driven specs (auth/onboarding/page-smoke) still can't
run in this container — same pre-existing Chromium-revision mismatch
noted in increment 1, unrelated to this change, not re-investigated this
pass (diminishing returns relative to this engine's own scope).

**Not tested this pass, honestly:** literal API-failure/missing-integration
handling, because there is none to test yet — this engine makes zero
external calls by design (no AI provider, no third-party API), so "handle
a failed integration gracefully" doesn't currently apply to it. Worth
revisiting the moment any future increment adds one (e.g., an AI
phrasing layer).

### What's genuinely differentiated vs. what's standard engineering

**Genuinely differentiated (the actual hypothesis to validate with real
athletes/coaches):** the cross-domain ranking itself — that one engine,
reading real rows no other sports-tech product has in one place
(training + film + academics + recruiting), can produce a single ranked
priority with real evidence, and that the *same* signal can be
simultaneously meaningful to an athlete and their coach without either
side needing to manually reconcile it. That the recommendation
self-updates when the underlying data changes, with zero manual
refresh/reconciliation step, is the "nobody else connects these" claim —
and it's currently a hypothesis proven by one clean demo scenario, not by
real usage data yet.

**Standard, not differentiated (true and worth saying plainly):** the
reconciliation mechanics (match-or-create against a persisted table), the
scoring formulas (linear point additions with caps), the authorization
pattern (team-role-scoped queries) — all ordinary, correct engineering,
not a moat on their own. A competitor could build the mechanics in a
sprint. What they can't trivially copy is the *data* MENTA already has in
one schema to feed it.

**Still needs real pilot evidence, not assumed:** whether athletes who
act on a Next Move recommendation measurably develop faster or more
consistently than those who don't; whether coaches who get a ranked queue
actually intervene more effectively than scanning a roster by hand;
whether the specific signal thresholds (21-day goal staleness, 14-day
recruiting staleness, etc.) match what real coaches consider urgent. None
of this is claimed as proven anywhere in this codebase or this document —
it's the next real validation work, not a demo-script footnote.

## Increment 3: the Intelligence Experience — honest outcomes, not just alerts (2026-10-14)

**Checkpoint discipline:** increment 2 was committed locally as a second
checkpoint before this increment began (per the user's explicit "keep both
commits local, do not push yet"). This increment's changes are not yet
committed at the time of writing — see end-of-increment report for the
commit decision. No push has occurred at any point in this project.

### Priority 1 — perfected Next Move experience, both audiences

Both `NextMoveCard.tsx` (athlete) and `CoachNextMoveQueue.tsx` (coach) now
answer the same four questions the mission brief named, not just "what's
next":

- **Why this, not something else** — a live-recomputed `competingCount`
  ("chosen over N other outstanding items") on the athlete side. The coach
  side already shows this structurally (`CoachNextMoveQueue` is a visible
  ranked queue, not a single slot — "also waiting (N)" already answers
  "why this one first").
- **What happens when it's done** — a new "Recently resolved" history
  panel on both interfaces, each row showing the real outcome (see
  Priority 2), not just a checkmark.
- **A real signal that the athlete/coach actually engaged** — `acceptedAt`
  on `NextMoveRecommendation`, set only by a genuine click on the primary
  action (fire-and-forget `keepalive` POST to `/api/next-move` or
  `/api/coach-queue` with `action: "accept"`), never inferred from a page
  view. Idempotent on repeat clicks (second click returns success, not a
  false 404 — fixed before shipping, see below).

No new visual language was introduced — same card/badge/mono-label system
as increment 1 and 2, a collapsible `<details>` for history so it doesn't
compete visually with the primary recommendation.

### Priority 2 — the outcome evidence engine (the actual "development loop")

New `getOutcomeEvidence()` in `src/lib/next-move.ts`, computed only for
RESOLVED rows, returns one of five honest states —
`IMPROVED` / `DECLINED` / `NEW_DATA` / `COMPLETED_ONLY` / `INSUFFICIENT_DATA`
— per recommendation kind:

- **`GOAL_STALE` is the one kind with a real before/after number.** A
  hidden `__baselineProgress` evidence field (stripped before any client
  sees it, same convention as `resolutionKey`) captures `Goal.progress` at
  the moment the recommendation is created — the only way to later say
  "progress went from 20% to 75%" honestly, since `Goal` keeps no history
  of its own. Verified live: a goal flagged at 20% progress, later updated
  to 75% and marked `ACHIEVED`, resolves with
  `{status: "IMPROVED", detail: "Progress went from 20% to 75%."}`.
- **`PERFORMANCE_STALE` deliberately never says IMPROVED/DECLINED.** A
  freeform `PerformanceEntry.statName` has no schema-level notion of which
  direction is "better" — a new 40-yard-dash time and a new bench-press max
  mean opposite things for "higher is better." Logging a new entry always
  resolves as `NEW_DATA` with a neutral, factual detail string. This was a
  deliberate design choice to avoid exactly the kind of fabricated
  "improvement" claim the mission brief explicitly forbids, verified by a
  dedicated test asserting the detail text never contains "improv" or
  "declin".
- The remaining five kinds (`TRAINING_GAP`, `ACADEMIC_OVERDUE`,
  `ELIGIBILITY_INCOMPLETE`, `RECRUITING_STALE`, `FILM_ASSIGNMENT_OVERDUE`,
  `FILM_REVIEW_UNANSWERED`) honestly report `COMPLETED_ONLY` (a real
  follow-up event was observed — a new workout, a graded assignment, a new
  outreach log, etc.) or `INSUFFICIENT_DATA` (resolved, but no follow-up
  evidence exists yet) — never promoted to "improved" without a genuine
  before/after number, exactly the completion-vs-improvement line the
  mission brief draws.

**Bug caught before shipping:** the first version of `acceptNextMove()`
used a single `updateMany({ where: { acceptedAt: null } })` guard, so a
second click on an already-accepted recommendation returned `count: 0` →
the API responded `404 Not Found` — misleading, since the row exists and
belongs to the caller, it's just already accepted. Fixed by looking the
row up first and only conditionally writing `acceptedAt`, so repeat clicks
are idempotently successful. Covered by a new test asserting the second
accept returns 200 with the same `acceptedAt` timestamp as the first.

### Priority 3 — further module connections: audited, none added this pass

Explicitly asked not to connect every domain automatically. Audited the
remaining unconnected domains against the same bar increment 2 already
established (sound product reason + sufficient evidence + real
authorization):

- **Messages/Conversations** — no sound reason found: surfacing "unanswered
  coach DM" as a Next Move item would require knowing message *content* is
  non-sensitive, which isn't true in general (a DM thread can turn into
  exactly the kind of personal conversation Recovery/Mindset already treats
  as private). Not added.
- **Safety checklists** (`SafetyChecklistItem`, `TeamSafetyChecklistItem`)
  — plausible on its face (same shape as `EligibilityChecklistItem`), but
  `src/lib/permissions.ts` grants no existing coach-visibility model for an
  individual athlete's safety profile, and it's adjacent to medical/safety
  data (CLAUDE.md's `CareRequest` privacy rule neighbors this domain
  closely). Needs its own deliberately-designed authorization pass, not an
  engine addition riding on an assumption. Not added.
- **Documents** — no existing due-date/staleness concept at all (no
  `dueDate`/`status` field to key a "stale" signal off of); would require
  new product definition of what "needs attention" even means for a
  document, not just new engine code. Not added.
- **Academics → coach visibility** — confirmed by grep against
  `permissions.ts`: zero existing coach read-access to `Assignment` today.
  Adding a coach-facing academic signal is real, separately-designed
  product work (the increment 2 roadmap already named this as a future
  item) — still correctly not assumed into this engine.

**Conclusion: zero new domain connections this increment.** The honest
finding is that the right next investment is building the *authorization*
for a new domain (e.g., a real, consented academic-alerts view for
coaches) before the engine reads from it — not quietly widening the
engine's queries into data nothing has explicitly authorized a coach or
engine to see.

### Priority 4 — live demonstration hardened, and the Chromium blocker is fixed

**Demo scripts reviewed, re-verified live, still safe:**
`scripts/seed-demo-scenario.mjs`/`reset-demo-scenario.mjs` isolation
(`@menta-demo.local` domain, `[MENTA DEMO]` name prefix) re-confirmed by
actually running the full round trip against this container's dev
database: seed → real login via `/api/auth/login` for both the coach and
the primary athlete → `GET /api/next-move` and `GET /api/coach-queue` both
point at the exact same required film assignment (the connected-loop
claim, re-verified against the current, post-increment-3 code, not just
asserted from increment 2) → `PATCH .../targets/me` with `status:
"COMPLETED"` (the real, already-shipped "Mark complete" button's endpoint)
→ both sides independently re-fetch and show the loop closing: the
athlete's Next Move advances to the next real priority, the coach's queue
drops the item into history with an honest `COMPLETED_ONLY` outcome and
promotes the next athlete needing attention → `reset-demo-scenario.mjs`
removes exactly the 3 demo users and leaves the database at the same
`user: 0, team: 0, nextMoveRecommendation: 0` baseline it started at.

**The Chromium browser-revision mismatch (documented as a blocker in
increments 1 and 2) is now fixed, not just re-documented.** Root cause
confirmed: `@playwright/test@1.62.1`'s bundled `browsers.json` expects
Chromium revision `1234`, but this container only pre-installs revision
`1194` (`chromium-1194`, `chromium_headless_shell-1194`) — a real
version gap, not a path/naming issue (an earlier symlink attempt in
increment 1 correctly identified this as unfixable by renaming alone,
since `1194`'s headless-shell directory layout genuinely differs from what
`1234` expects). The fix: `/opt/pw-browsers/chromium` is a working symlink
straight to the full `1194` Chrome binary (not the headless-shell variant
Playwright was trying to resolve by revision number) — pointing
`playwright.config.ts`'s `chromium` project at it directly via
`launchOptions.executablePath` bypasses Playwright's own revision
resolution entirely. **Verified: the full previously-blocked
browser-driven suite (`auth.spec.ts`, `onboarding-multisport.spec.ts`,
`onboarding-regression.spec.ts`, `page-smoke.spec.ts`) now runs and
passes**, in addition to the API-level suites — see Priority 5 for the
actual numbers. This removes a real blind spot: any future UI-only change
(the kind increment 3's own `NextMoveCard`/`CoachNextMoveQueue` edits are)
can now be verified end-to-end through a real browser, not just by API
round-trips plus manual reasoning about the JSX.

### Priority 5 — full verification

- `npx tsc --noEmit` — clean.
- `npm run lint` (ESLint) — clean.
- `npm run build` — clean production build, no new warnings.
- `npx playwright test` (full suite, all 7 spec files, 35 tests,
  browser-driven and API-level together) — **35/35 passing**, including 2
  new tests added this increment (`acceptedAt` idempotency and
  cross-athlete isolation; outcome evidence for both the real-baseline
  `GOAL_STALE` case and the deliberately-neutral `PERFORMANCE_STALE` case).
  One run of the full suite produced 2 failures in
  `film-intelligence-security.spec.ts` on two deeply-nested dynamic routes
  (`.../position-groups/[groupId]/members`, `.../athletes/[athleteId]/notes`)
  that are not touched by this increment; re-running that file alone, and
  re-running the full suite a second time, both passed clean — consistent
  with this repo's already-documented "first cold request per route is
  slow under Turbopack dev mode" characteristic racing against a
  first-compile on a rarely-hit nested route, not a real regression. Not
  swept under the rug: written down here exactly as observed, including
  that it reproduced once and did not reproduce on retry.
- `git status` reviewed before and after — only the files this increment
  actually intended to touch, one additive migration folder (`ALTER TABLE
  "NextMoveRecommendation" ADD COLUMN "acceptedAt"`), no secrets, no
  generated artifacts, nothing unrelated.

### What's genuinely new vs. what increment 2 already established

The cross-domain ranking and connected-loop claims are unchanged from
increment 2 — still a demonstrated architecture, still not yet validated
with real athletes/coaches. What's new and real in increment 3: the
engine now honestly distinguishes "this got done" from "this got better,"
with one domain (`GOAL_STALE`) actually proving the latter with a real
number, and explicitly refuses to manufacture that distinction for domains
where the schema doesn't support it. That refusal — NEW_DATA instead of a
fabricated IMPROVED — is itself the product decision most worth being
honest about in an investor conversation: MENTA can prove progress where
it has a real baseline, and says so plainly where it can't yet.

## Next highest-value increment (not yet started)

1. **Real pilot validation** — every "genuinely differentiated" claim in
   this document (increments 1–3) is still an architecture-stage
   hypothesis. The single highest-value next step is getting this in front
   of real athletes and coaches and observing whether the ranking actually
   matches what they'd prioritize themselves, and whether outcome evidence
   changes behavior.
2. **A real, separately-designed coach-facing academic-alerts view** — the
   one concrete "next domain connection" this increment's audit identified
   as sound in principle but requiring new authorization work first (its
   own consent/visibility model), not an assumption riding on the existing
   engine.
3. **Extend outcome evidence to more kinds as the schema allows** — e.g. if
   `PerformanceEntry` ever gains a per-stat "higher is better" direction
   (a real schema/product decision, not an engine-side guess), 
   `PERFORMANCE_STALE` could honestly graduate from `NEW_DATA` to
   `IMPROVED`/`DECLINED` — but only once that ground truth actually exists.

Recommend (1): everything else in this document is architecture and
honest self-assessment; the one thing no amount of further internal
engineering can substitute for is real usage evidence.

## Pilot-readiness audit (2026-10-15)

Shifted from feature development to pilot readiness per explicit
instruction. No feature work this pass — audit, verification, and small
targeted fixes to things the audit itself broke or found broken. Full
findings delivered in-session; summarized here for the running record.

**Fixed this pass (small, scoped, not new features):**
- `playwright.config.ts`'s Chromium `executablePath` fix (increment 3) was
  gated behind `fs.existsSync()` after discovering it would have silently
  broken CI (`.github/workflows/e2e.yml` installs its own correct
  Chromium revision and never needs the hardcoded container path).
- A real-browser, two-session walkthrough of the full demo (seed → login
  as both Jordan and the coach → "Act on this" → the real `/assignments`
  "Mark complete" button → both dashboards re-verified) surfaced a visible
  bug: the dashboard's time-of-day greeting reads `name.split(" ")[0]`,
  and `"[MENTA DEMO] Jordan Carter"` split to `"[MENTA"` — rendering "Good
  evening, [MENTA." on the single most visible screen of the demo. Fixed
  by moving the demo tag to the end of each name
  (`scripts/seed-demo-scenario.mjs`); reset safety unaffected (reset
  matches on email domain and team name, never user name).

**Blockers found, ranked, not yet fixed (see in-session report for full
detail and severity reasoning):**
1. Email delivery (`RESEND_API_KEY`) is unconfigured by default — real
   signup/password-reset codes only reach the server console, not a real
   pilot participant's inbox.
2. Film/document storage is local-disk (`src/lib/storage.ts`), which does
   not survive a restart in an ephemeral container — a real risk if the
   pilot is hosted anywhere non-persistent.
3. No account/data-deletion path exists in the product itself for a real
   user (only a raw DB script scoped to demo accounts).
4. Minor-status protection fails open: `dateOfBirth` is optional at
   signup and `isMinor(null) === false`, so leaving it blank silently
   skips minor-specific protections.
5. Signup is rate-limited to 8/IP per 15 minutes — a real risk if an
   entire pilot team signs up together from one shared network.
6. The Next Move primary action for an overdue film assignment
   (`FILM_ASSIGNMENT_OVERDUE`) sends the athlete to `/film/[id]`, which has
   no completion control — they must separately navigate to
   `/assignments` to actually mark it done. Not broken, just not the one
   smooth click the product's own design principle calls for; the
   recommended single highest-value engineering task before pilot.
7. The demo seed's placeholder video has no real file on disk — pressing
   play in a live demo throws a 500 from the streaming route. Avoid
   clicking play, or pre-load a small real video file before presenting.

Full minimum-viable-pilot plan, validation protocol, and investor-demo
runbook (exact seed/login/demo/reset commands, now verified through a real
two-browser-session walkthrough) delivered in-session rather than
duplicated here.
