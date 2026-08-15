# MENTA Audit Report

**Date:** 2026-08-15
**Repo/branch audited:** `elias4mayor/Menta`, branch `claude/menta-master-build-plan-62qt1j`
**Commit at audit time:** `8171bb1` (pre-audit) → fixes applied on top, see §6
**Scope note:** No `MENTA_AUDIT_PROMPT.md` file exists in this environment or
anywhere reachable from it. This audit was run against the only MENTA
checkout available in this session (`/home/user/Menta`) — the current
premium redesign, not an older version — using the audit spec as given in
the request.

**Method:** Live testing, not just code reading. Dev server run against a
real SQLite DB; real HTTP requests through Playwright (signup, login, wrong
password, forgot-password, AI chat, goal/workout/performance/guardian CRUD,
unauthenticated redirect, mobile viewport) plus a full route sweep
capturing console errors, failed network requests, and HTTP error statuses.
Where a flow was already verified with real testing earlier in this same
build (e.g. Film upload/streaming, cross-user isolation), that is stated
explicitly rather than re-claimed as newly tested.

---

## 1. Total features audited

**62** — every item enumerated across the 7 categories in the audit
request (Authentication, Email, AI, Athlete, Coaches & Teams,
Parents/Guardians, MENTA Safety) plus Media and Technical.

## 2. Working features (48)

**Authentication (7/7):** sign up, login, logout, password reset request,
password reset completion, session handling (view/revoke), role field
enforced server-side.

**Email (1/2 fully; 1 correctly gated):** dev-mode console-log fallback
works exactly as documented. Real sending is `BLOCKED BY EXTERNAL
DEPENDENCY` (see §4) — not broken, just unconfigured in this environment.

**AI (2/8):** live chat architecture (routes to Anthropic when configured;
honestly reports "not connected" when not — verified live, see §10),
athlete context building (profile/goals/calendar/training/performance/
highlights — fixed this session, see §6).

**Athlete (11/14):** dashboard, profile (view/edit + visibility, including
the minor cap), training (workout library + completion), performance (stat
entries + trends), goals (CRUD + progress), film (upload/library/player/
clips — verified via code inspection + prior build/QA testing this session,
not re-uploaded this round), highlights (reel builder), onboarding
(functional but not enforced — see §3), notifications, calendar, messaging.

**Coaches & Teams (4/8):** coach accounts (role-gated), team accounts
(create/join/roster), athlete visibility via team membership, film sharing
(team-scoped visibility).

**Parents/Guardians (4/4):** guardian linking request/approve/deny/revoke
(built and live-tested this session — full state machine verified), minor
visibility cap, notifications on link events, permission enforcement (only
the athlete can approve, either side can revoke).

**MENTA Safety (2/2 for what exists):** the page correctly does **not**
claim to predict emergencies — it's an honest `ComingSoon` stating exactly
what's needed (EmergencyContact/SafetyProtocol models, a real weather API,
professional review) before it goes live. Nothing fake is presented as
real.

**Media (5/5):** image uploads (gallery/story photos present and serving),
image display (18/18 gallery slides load, zero broken paths — verified live),
gallery rotation + hover-pause + reduced-motion handling, video streaming
with HTTP Range support (code-verified; byte-diff tested earlier this
build), file-type/size validation on film upload.

**Technical (12/14):** database (SQLite dev, Postgres-portable schema),
API authorization (every mutating route checks the session server-side —
verified 401s for every unauthenticated CRUD attempt), rate limiting on
sensitive endpoints, audit logging (29+ call sites), password hashing
(bcrypt cost 12), session security (HMAC'd, DB-backed, revocable, httpOnly/
secure/sameSite cookies), `?next=` redirect preservation, mobile
responsiveness (0 horizontal overflow on home or dashboard at 390px —
verified live), navigation (centered logo, hover/click/keyboard-accessible
Platform dropdown), error handling (no stack traces or internals leaked in
API error responses — verified by code inspection), secrets hygiene (`.env`
gitignored and untracked, no secrets logged).

## 3. Partially working features (6)

| Feature | What works | What's missing |
|---|---|---|
| Onboarding | Real multi-step wizard, writes to `AthleteProfile` | Not enforced — a user can reach the full app without completing it (confirmed live: login after signup went straight to `/dashboard`, not back to `/onboarding`) |
| Coach role | Roster view, invite code, team messaging | No coach-specific dashboard, no assign-workout-to-athlete, no cross-athlete performance view |
| Team communication | Team group chat, 1:1 DMs, block/report | No announcements-only broadcast channel distinct from chat |
| AI context | Now pulls real training/performance/highlight data (fixed this session) | Still has no Recovery/Academics/Recruiting/Safety data to pull, since those modules don't exist yet — correctly disclosed in the system prompt |
| Notifications | Real, DB-backed, generated by real events | No email/push delivery — in-app only (documented, not hidden) |
| Accessibility | Decorative gallery images now correctly `aria-hidden` with an `aria-label` on the container (fixed this session) | No sitewide a11y audit (color contrast beyond the one token fixed in a prior QA pass, focus-trap testing on modals/dropdowns, screen-reader pass) has been done |

## 4. Broken features (0)

None found. Every flow tested — signup, login, wrong-password rejection,
forgot-password, AI chat (both configured-off and the request/response
path), goal/workout/performance creation, guardian-link request/approve/
revoke, unauthenticated-redirect, mobile layout — returned correct status
codes and correct behavior. Zero console errors, zero failed network
requests, zero broken image loads across the full route sweep.

## 5. Missing features (12)

Recovery, Mindset, Academics, Recruiting, Wearables integration, Nutrition,
Health & Injury support, Camps & Events, College & Career, Coach-specific
dashboard, Parent-specific dashboard (guardian *linking* exists; a
summary *view* doesn't), Team-wide analytics. All either don't exist at all
or are honestly labeled `ComingSoon` stubs — none are faked.

## 6. Features fixed this audit

1. **Stale README** — still described Training/Performance/Film as not-yet-built and used a "Phase 1 foundation" framing, even though those shipped in Phase 2/3 and guardian-linking/minor-cap shipped this session. Rewrote the "what's working / what's not" sections to match actual current state. (`README.md`)
2. **Gallery accessibility gap** — the 18 rotating background-image slides had no ARIA semantics; a screen reader had no signal they were decorative or what the visible photo was. Added `aria-hidden="true"` to each slide `div` and `role="img"` + `aria-label={caption}` on the container. (`src/components/LiveGallery.tsx`)

No functionality was removed. No data was invented. No architecture changed.

*(Note: the onboarding-not-enforced and no-coach/parent-dashboard items in
§3/§5 were **not** fixed — those are product-scope decisions, not bugs, and
the request said not to make architectural changes without explaining why.
Enforcing onboarding or building role-specific dashboards would be a real
feature addition, not a safe fix, so it's listed as a recommendation in §26
instead.)*

## 7. Security issues

- **No MFA, no explicit CSRF token** (same-site cookies + POST-only
  mutations mitigate but don't fully replace CSRF protection) — documented,
  not hidden, pre-existing.
- **In-memory rate limiting** — correct for a single instance, resets on
  redeploy, doesn't coordinate across multiple instances. Needs a shared
  store (Redis/Upstash) before horizontal scaling.
- **No dependency/security audit or penetration test performed** on this
  codebase to date.
- **Guardian-link + minor-cap is new** (this session) — functionally
  verified live, but hasn't had adversarial/edge-case testing beyond the
  happy-path + the specific rejection cases exercised (self-approval,
  duplicate request, non-parent requester).
- Nothing found that leaks secrets, stack traces, or other users' data.

## 8. Performance issues

- Local-filesystem film storage doesn't scale past a single instance and
  isn't durable across redeploys — documented in code, real blocker before
  production video usage at any scale.
- No CDN/edge caching strategy evaluated for the gallery images beyond
  Next's default static asset serving.
- No load testing has been done on any endpoint.

## 9. UX issues

- Onboarding can be silently skipped with no later prompt beyond a small
  dashboard hint ("Finish onboarding to set up your profile") — easy to miss.
- No coach- or parent-facing summary view — both roles currently see the
  same athlete-oriented `AppShell` nav and dashboard.

## 10. AI status

**Architecturally real, currently unconfigured in this environment.**
`ANTHROPIC_API_KEY` is unset here — verified live: `/api/ai` GET reports
`configured: false`, and a POST returns the honest message *"MENTA AI isn't
connected yet — an administrator needs to set ANTHROPIC_API_KEY on the
server. This isn't a real answer."* with a `200` (correctly not an error
state, just an honest non-answer). No fabricated reply at any point. When a
real key is set, the system prompt explicitly forbids inventing stats,
recruiting info, or medical/legal claims, and the context builder (fixed
this session) now includes real training/performance/highlight data instead
of a stale placeholder.

## 11. Email status

**Architecturally real, blocked by external dependency in this
environment.** `RESEND_API_KEY` is unset — the code path for that state
(log to server console instead of a fake "sent" response) is implemented
and was verified via a live `forgot-password` request (`200`, no error).
Real delivery requires a Resend API key and a verified sending domain,
neither configured here.

## 12. Auth status

**Fully working**, live-verified this session: signup → onboarding
redirect, login → dashboard, wrong password → `401`, forgot-password →
`200` (identical response whether or not the email exists, preventing
enumeration — code-verified), session cookies are httpOnly/secure/sameSite,
password-reset tokens are single-use/hashed/expiring, unauthenticated
access to a protected route redirects to `/login?next=...` with the target
path preserved.

## 13. Database status

SQLite in this dev environment, schema intentionally avoids native enum
types so it ports to Postgres unmodified (documented, `DATABASE_URL` swap
only). 26 models. No migration issues encountered during `npm run build`.

## 14. Image/media status

18/18 gallery images load (13 stock + 4 founder-story + 1 new end-zone
photo, all committed this conversation), zero broken paths, zero failed
image network requests across the full live route sweep. Video
upload/streaming verified via code inspection this round (Range-request
support, permission-checked on every byte) — the actual byte-diff upload
test was performed and passed earlier in this build (Phase 3), not
repeated this round since the code hasn't changed since.

## 15. Recruiting status

**Not built.** Honest `ComingSoon` stub stating what it needs: a licensed
college/coach data source, `RecruitingSchool`/`Coach`/`RecruitingContact`
models, AI outreach drafting scoped to the athlete's own data. No fabricated
college data anywhere.

## 16. Coach/team status

Team creation, joining, roster viewing, and team-scoped messaging all work
and are real. No coach-specific dashboard, athlete-assignment, or
cross-athlete analytics exist yet.

## 17. Parent/guardian status

**Fully working**, built and live-tested this session: a `PARENT` account
requests a link by athlete email → athlete gets a real notification →
approves/denies/revokes → both sides see current status. Self-approval by
the guardian is correctly rejected (`403`). No dedicated parent dashboard
view exists beyond this linking mechanism.

## 18. MENTA SAFETY status

**Correctly unbuilt and correctly honest about it.** The stub explicitly
states it will never claim to predict cardiac events, heat stroke, or
concussions, and lists exactly what's needed (data models, a real weather
API, professional safety review) before it's presented as real. Verified:
no code path anywhere in the app makes a safety/medical prediction claim.

## 19. Mobile status

Verified live at a 390×844 viewport: zero horizontal overflow on the
homepage or dashboard (`document.body.scrollWidth` = 390 on both, i.e. no
overflow past the viewport). Screenshots confirm nav, hero, and dashboard
cards all reflow correctly.

## 20. External dependencies

| Dependency | Status | Blocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | Not set here | Real AI responses |
| `RESEND_API_KEY` | Not set here | Real email delivery |
| Object storage (S3/R2) | Not integrated | Durable, multi-instance film storage |
| Redis/Upstash | Not integrated | Multi-instance rate limiting |
| Weather/emergency data API | Not integrated | MENTA Safety going live |
| Licensed recruiting data source | Not integrated | Recruiting going live |
| Wearable vendor APIs (WHOOP/Apple Health/Garmin/Fitbit/Oura) | Not integrated | Wearables feature |

## 21. Production blockers

1. Guardian/minor privacy: onboarding doesn't collect or enforce guardian
   consent at signup for minors (data model + linking now exist, but no
   consent *gate*) — flagged in the codebase's own legal-review section.
2. No Terms of Service / Privacy Policy in-app.
3. Film storage on local disk — not durable, won't survive a redeploy.
4. In-memory rate limiting — won't coordinate across multiple instances.
5. No MFA, no formal CSRF token, no third-party security audit.
6. `ANTHROPIC_API_KEY` / `RESEND_API_KEY` unset (expected in dev, required
   before real users depend on AI or email).

## 22. P0 — Critical

- Guardian/minor consent gate at signup (legal exposure, not just a feature
  gap)
- Terms of Service / Privacy Policy before any real user signs up
- Object storage swap before film is used with real, non-throwaway video

## 23. P1 — High

- Redis-backed rate limiting before multi-instance deployment
- Coach-specific dashboard (team-wide goal/training/performance view)
- Enforce or clearly re-prompt onboarding completion
- Security audit / dependency scan before public launch

## 24. P2 — Important

- Parent-specific summary dashboard (beyond linking)
- Team-wide analytics
- Academics module (GPA tracker, assignments, eligibility)
- Recovery check-ins (manual entry, no wearables yet)

## 25. P3 — Future

- Wearables integrations (WHOOP, Apple Health, Garmin, Fitbit, Oura)
- Recruiting module (needs licensed data source first)
- MENTA Safety (needs real weather API + professional review)
- Nutrition, Camps & Events, College & Career modules
- Sitewide accessibility audit (contrast, focus traps, screen-reader pass)

## 26. Recommended next 10 features

1. Guardian consent gate at signup for minors
2. Coach dashboard (team goals/training/performance rollup)
3. Enforce/re-prompt onboarding completion
4. Object storage swap for Film (S3/R2)
5. Redis-backed rate limiting
6. Academics module (GPA/assignment tracker)
7. Recovery check-ins (manual, no wearables dependency)
8. Parent summary dashboard
9. Team-wide analytics view
10. Terms of Service / Privacy Policy pages

## 27. Production readiness score

**58/100**

Reasoning: the built features (auth, permissions, teams, messaging,
calendar, goals, training, performance, film, guardian linking, AI shell)
are genuinely solid — real server-side authorization throughout, zero fake
data anywhere, zero found bugs this round. What holds the score down isn't
code quality, it's real gaps that matter for a platform whose primary users
include minors: no consent gate, no legal pages, ephemeral file storage,
single-instance-only rate limiting, and roughly half the vision (Recovery,
Academics, Recruiting, Safety, coach/parent dashboards) not yet built —
though every one of those is honestly labeled rather than faked, which is
exactly what keeps this from scoring lower.

## 28. Exact commands to run next

```bash
# Verify this audit's changes locally
cd Menta
npm install
npm run lint
npm run build
npm run dev   # visit http://localhost:3000

# Review the diff before committing
git status
git diff README.md src/components/LiveGallery.tsx

# When ready to commit (not pushed, per instructions)
git add README.md src/components/LiveGallery.tsx MENTA_AUDIT_REPORT.md
git commit -m "Audit: update stale README, add gallery a11y labels, add audit report"
```
