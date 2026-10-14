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

## Next highest-value increment (not yet started)

1. **Outcome tracking** — now that both athlete and coach history persist
   in `NextMoveRecommendation`, the next real step is measuring what
   happens *after* resolution: did a performance entry improve following a
   `TRAINING_GAP` resolution? Did grades recover after an `ACADEMIC_OVERDUE`
   resolution? This turns the engine from "reactive and real" into
   "evidenced," which is the actual investor-grade claim.
2. **Extend signal domains with real new coach-facing views** — Safety
   (incomplete personal safety profile for a minor) and a genuine,
   separately-designed Academic-alerts view for coaches (not assumed —
   built deliberately, with its own consent/visibility rules, the way
   `CoachDashboard.tsx`'s own comment always intended).
3. **Fix the Chromium-revision mismatch** in this container so the
   browser-driven Playwright suite (auth, onboarding, full-page smoke)
   can run again — currently a blind spot for any future UI-only change.

Recommend (1): it's the difference between "MENTA connects your data" and
"MENTA's connections measurably help," which is the exact distinction the
mission brief draws between a promising hypothesis and a proven moat.
