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

## Next highest-value increment (not yet started)

Options considered, in rough priority order:
1. **Coach-side Next Move** — a position coach's own ranked list ("3 of
   your QBs have overdue film assignments, 1 has a stale recruiting list")
   using the exact same engine pattern, scoped through the existing
   Film Center permission system. Reuses almost everything just built.
2. **Outcome tracking** — once there's enough resolved-recommendation
   history, show "athletes who acted on a training-gap recommendation
   logged performance entries this often afterward" — turns the engine
   from reactive to a measurable product claim for the PEAKS demo.
3. **Extend signal domains** — Care (open-but-unscheduled care requests),
   Safety (incomplete personal safety profile for a minor).

Recommend (1): it directly extends the signature experience to the other
side of the product (coach) instead of adding a new category of feature,
and it's the natural next vertical slice for a live two-sided demo
(athlete gets a recommendation → acts on it → coach's queue reflects it).
