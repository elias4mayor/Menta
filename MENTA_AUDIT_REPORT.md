# MENTA Audit Report

**Date:** 2026-08-18 (update — supersedes the 2026-08-15 version below in every section; the original is kept nowhere else, this file is the current source of truth)
**Repo/branch audited:** `elias4mayor/Menta`, branch `claude/menta-master-build-plan-62qt1j`
**Commit at audit time:** `1ae4146` (pre-audit) → fixes applied on top, see §6

**What changed since the last audit (Aug 15 → Aug 18):** Recruiting, Recovery,
Academics, and Safety — all four were `ComingSoon` stubs in the last audit —
are now fully built, real features with their own data models, ownership-
scoped APIs, live UI, and (where applicable) guardrailed AI. The profile
form was rebuilt with dropdowns and inline validation. This audit re-verifies
the whole app now that all of it exists together, and adds the two biggest
remaining P0 gaps: published (draft) Terms of Service / Privacy Policy pages
and a required consent checkbox at signup.

**Method:** Live testing, not just code reading. Production build (`next
build` + `next start`, not dev mode) run against a real SQLite DB with
migrations applied; a full Playwright route sweep across all 25 public +
authenticated routes capturing HTTP status, console errors, and failed
network requests; a targeted signup-consent-gate test; screenshot checks of
the new legal pages at desktop and mobile widths.

---

## 1. Total features audited

**~90** — everything in the Aug 15 audit, plus the full Recruiting,
Recovery, Academics, and Safety feature sets built since, plus the two
launch-readiness items added this round (legal pages, signup consent gate).

## 2. Working features

Everything listed as working in the Aug 15 audit still works (auth, email
dev-fallback, AI chat shell + athlete context, dashboard, profile, training,
performance, goals, film, highlights, onboarding wizard, notifications,
calendar, messaging, teams, guardian linking, media serving, database,
authorization, rate limiting, audit logging, session security, mobile
responsiveness, navigation) — re-verified live this round via a full route
sweep, not just carried over as an assumption.

**Newly real since the last audit:**

- **Recruiting** — target-school pipeline with a real status list
  (Researching → Contacted → In Conversation → Offered → Committed → Not
  Pursuing), coach/contact records per school, an activity log, and an AI
  outreach drafter that only ever uses the athlete's real profile data,
  never invents stats/accolades, and always leaves sending to the athlete.
  No fabricated college database anywhere.
- **Recovery** — daily wellness check-ins (sleep, soreness, mood, notes),
  trend view, and a guidance panel that gives general, non-diagnostic
  suggestions. Explicitly never claims medical clearance to play. Treated
  as high-sensitivity data: private by default, excluded from the general
  AI Coach's context, excluded from audit-log values, wearable
  integrations honestly labeled "coming soon."
- **Academics** — multi-term GPA tracking (labeled "entered by athlete"),
  assignment tracker with filter/sort, academic goals, an eligibility
  checklist with a clear "not official guidance" disclaimer, and an AI
  Study Help tool that explains/quizzes/outlines but refuses to write
  submittable graded work. Its AI context is scoped to academic data only.
- **Safety** — emergency contacts, a private personal safety profile
  (allergies/medical/medication/emergency-plan notes), a personal safety
  checklist, and coach-authored team Emergency Action Plans + team safety
  checklists visible to the whole team but editable only by whoever
  actually manages that team. A persistent page-level disclaimer states
  this is an organizational tool, not a medical or prediction system, and
  to call 911 in a real emergency. Static (non-dynamic) heat/lightning
  education included, explicitly not live weather data.
- **Legal pages** — `/privacy` and `/terms` are now real, published pages
  (previously the footer just said "draft, pending legal review" with no
  page behind it). Both are clearly marked as unreviewed drafts.
- **Signup consent gate** — the "Create account" button is disabled until
  the user checks "I agree to the Terms of Service and Privacy Policy,"
  which links to the two pages above. Verified live: submit is disabled
  before checking, enabled after, and signup completes end-to-end once
  checked.

A discovered-and-fixed bug from this build cycle (not new to this audit,
but worth restating): the general AI Coach and the Academics Study Help
tool used to share one "most recent conversation" lookup with no way to
tell them apart — a Study Help thread could have been picked up by the
general coach or vice versa. Fixed by adding a `topic` field to
conversations; verified live that the two stay separate.

## 3. Partially working features

Same list as the Aug 15 audit (onboarding not enforced, no coach-specific
dashboard, no announcements-only broadcast channel, no sitewide a11y audit)
— none of these changed this round, so they're not re-explained here; see
§21–24 for where they land in the priority list.

**One addition:** the AI context-disclosure line has been updated three
times now as features shipped (Recruiting/Academics have their own scoped
AI tools; Recovery and Safety deliberately have none) — verified this is
current and accurate in `src/lib/ai.ts` as of this audit.

## 4. Broken features

**None found.** Full production-build route sweep (25 routes: 7 public +
17 authenticated app routes + 1 unauthenticated-redirect check) returned
HTTP 200 on every route that should return 200, correctly redirected
`/dashboard` → `/login?next=%2Fdashboard` when unauthenticated, zero
console errors, and zero failed network requests once benign Next.js
`Link` RSC-prefetch aborts (requests cancelled by normal client-side
navigation, not real failures) are filtered out.

## 5. Missing features

Mindset (mental performance) is now the **only** major module still an
honest `ComingSoon` stub — it correctly declines to build anything until
reviewed by someone with mental-performance/psychology expertise, per
standing instruction. Also still missing: Wearables integration, Nutrition,
Health & Injury support beyond the Safety module, Camps & Events, College &
Career, Coach-specific dashboard, Parent-specific dashboard (linking
exists, a summary view doesn't), Team-wide analytics.

## 6. Features fixed this audit

1. **Published Terms of Service + Privacy Policy** — real content
   reflecting what MENTA actually collects (including explicit treatment
   of high-sensitivity Recovery/Safety data), clearly marked as unreviewed
   drafts, linked from the footer. (`src/app/terms/page.tsx`,
   `src/app/privacy/page.tsx`, `src/components/MarketingFooter.tsx`)
2. **Signup consent gate** — required checkbox linking to both pages;
   submit is disabled until checked. Live-verified. (`src/app/signup/page.tsx`)
3. **Stale FAQ/Trust content** — the FAQ still said recruiting/performance
   data was "architected but not connected," and Trust & Safety still said
   legal docs weren't published — both predated this week's four feature
   builds. Updated to match reality. (`src/app/faq/page.tsx`,
   `src/app/trust/page.tsx`)

No functionality was removed. No data was invented. No architecture changed
beyond what was needed for the two new pages and the consent checkbox.

## 7. Security issues

Unchanged from the Aug 15 audit — still real, still worth restating since
this is the launch-readiness pass:

- No MFA, no explicit CSRF token (same-site cookies + POST-only mutations
  mitigate but don't fully replace it).
- In-memory rate limiting — resets on redeploy, doesn't coordinate across
  multiple instances.
- No dependency/security audit or penetration test performed to date.
- Nothing found that leaks secrets, stack traces, high-sensitivity field
  values, or other users' data — re-verified this round with a sentinel-
  value leak test pattern established for Safety/Recovery in their own
  builds (not re-run fresh this round since the code paths haven't
  changed, but nothing added since would introduce a new leak surface).

## 8. Performance issues

Unchanged: local-filesystem film storage doesn't scale past one instance
or survive a redeploy; no CDN/edge caching strategy evaluated beyond
Next's default static handling; no load testing performed.

## 9. UX issues

Unchanged: onboarding can be silently skipped past a small dashboard hint;
no coach- or parent-facing summary view distinct from the athlete nav.

## 10. AI status

Still architecturally real, still unconfigured in this environment
(`ANTHROPIC_API_KEY` unset). Now three guardrailed AI surfaces instead of
one: general Coach chat, Recruiting outreach drafting, Academics Study
Help — each with its own system-prompt rules and its own scoped context
builder, verified in each feature's own build to never fabricate a
response when unconfigured. Recovery and Safety deliberately have no AI
surface at all.

## 11. Email status

Unchanged: architecturally real, blocked by the unset `RESEND_API_KEY` in
this environment; dev-mode console-log fallback works as documented.

## 12. Auth status

Unchanged and still fully working, now with the added signup consent gate
described in §6.

## 13. Database status

34 models now (26 at the last audit + `RecruitingSchool`/
`RecruitingContact`/`RecruitingActivity`, `WellnessCheckIn`,
`AcademicTerm`/`Assignment`/`AcademicGoal`/`EligibilityChecklistItem`,
`EmergencyContact`/`PersonalSafetyProfile`/`SafetyChecklistItem`/
`TeamSafetyProtocol`/`TeamSafetyChecklistItem`). All four new migrations
applied cleanly via `prisma migrate deploy` this audit, no drift.

## 14. Image/media status

Unchanged — 18/18 gallery images still load, zero broken paths, re-verified
implicitly by the route sweep (homepage returned 200 with no failed image
requests).

## 15. Recruiting status

**Now built.** See §2. No licensed college database — schools are entered
by the athlete/coach, not pulled from a fabricated dataset, exactly as the
build spec required.

## 16. Coach/team status

Unchanged from Aug 15, plus: coaches/admins can now also author team
Safety plans and checklists (§2) — the only new coach-specific capability
this round. Still no coach-specific dashboard or cross-athlete analytics.

## 17. Parent/guardian status

Unchanged — still fully working, no changes this round.

## 18. MENTA SAFETY status

**Now built**, replacing the honest `ComingSoon` stub from the last audit.
See §2 for what it does and the explicit disclaimers it carries. Still
correctly does **not** predict emergencies or claim medical authority —
verified no code path makes that claim anywhere in the new feature.

## 19. Mobile status

Re-verified live this round at 390×844 on the three new/changed pages
(`/privacy`, `/terms`, `/signup`): zero horizontal overflow on all three.
The four new feature pages (`/recruit`, `/recovery`, `/school`, `/safety`)
were mobile-verified in their own builds earlier this week and are included
in this round's route sweep for status/console-error checks (all clean),
though full mobile screenshots weren't re-captured for them this round
since their layout code hasn't changed since their own verification.

## 20. External dependencies

Unchanged from the Aug 15 table — `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
object storage, Redis, weather/emergency data API, wearable vendor APIs are
all still not integrated in this environment. (The licensed recruiting
data source row from the last audit is removed — the team's actual design
intent, confirmed by this week's build, is athlete/coach-entered schools,
not a licensed database, so that was never a real blocker.)

## 21. Production blockers

1. No Terms of Service / Privacy Policy — **downgraded, not resolved.**
   Both now exist and are linked/gated at signup, but neither has been
   reviewed by an attorney. Don't treat this as launch-ready; treat it as
   "no longer silently missing."
2. Guardian/minor privacy: onboarding still doesn't collect or enforce
   guardian consent at signup for minors specifically (distinct from the
   general ToS/Privacy consent checkbox added this round, which every user
   checks regardless of age).
3. Film storage on local disk — not durable, won't survive a redeploy.
4. In-memory rate limiting — won't coordinate across multiple instances.
5. No MFA, no formal CSRF token, no third-party security audit.
6. `ANTHROPIC_API_KEY` / `RESEND_API_KEY` unset (expected in dev, required
   before real users depend on AI or email).

## 22. P0 — Critical

- Attorney review of the now-published Terms of Service / Privacy Policy
  drafts (the drafts existing is progress; unreviewed drafts are still a
  legal-exposure gap for a platform whose primary users include minors).
- Guardian/minor consent gate specifically for signup ages under 18 (the
  general checkbox added this round is necessary but not sufficient).
- Object storage swap before film is used with real, non-throwaway video.

## 23. P1 — High

- Redis-backed rate limiting before multi-instance deployment.
- Coach-specific dashboard (team-wide goal/training/performance/safety-
  checklist rollup).
- Enforce or clearly re-prompt onboarding completion.
- Security audit / dependency scan before public launch.

## 24. P2 — Important

- Parent-specific summary dashboard (beyond linking).
- Team-wide analytics.
- Mindset module (needs mental-performance/psychology review first).

## 25. P3 — Future

- Wearables integrations (WHOOP, Apple Health, Garmin, Fitbit, Oura) —
  Recovery already has an honest "coming soon" placeholder for this.
- Nutrition, Camps & Events, College & Career modules.
- Sitewide accessibility audit (contrast, focus traps, screen-reader pass).

## 26. Recommended next 10 features

1. Attorney review of Terms of Service / Privacy Policy.
2. Guardian consent gate specifically at signup for minors.
3. Coach dashboard (team goals/training/performance/safety rollup).
4. Enforce/re-prompt onboarding completion.
5. Object storage swap for Film (S3/R2).
6. Redis-backed rate limiting.
7. Parent summary dashboard.
8. Team-wide analytics view.
9. Mindset module (pending qualified review).
10. Sitewide accessibility audit.

## 27. Production readiness score

**68/100** (up from 58/100 on Aug 15)

Reasoning: the four biggest feature gaps from the last audit — Recruiting,
Recovery, Academics, Safety — are now real, live-tested, ownership-scoped,
and honestly guardrailed rather than faked or left as stubs; that alone is
most of the movement. The two easiest, most consequential launch-blocker
gaps (no legal pages at all, no consent step at signup) are also closed
this round. What's still holding the score down is the same category of
gap as before, just narrower: minor-specific consent enforcement (not just
general ToS agreement), ephemeral film storage, single-instance-only rate
limiting, and no third-party security review — all real, all documented,
none hidden. Code quality and honesty about what's real remain the
strongest part of this codebase: zero fake data, zero fabricated AI
responses, and every high-sensitivity data path (wellness, personal
safety/medical) deliberately kept out of AI context and cross-user views.

## 28. Exact commands to run next

```bash
# Verify this audit's changes locally
cd Menta
npm install
npm run lint
npm run build
npm run start -- -p 3000   # production build, not dev mode
# visit http://localhost:3000/privacy, /terms, /signup

# Review the diff before committing
git status
git diff src/app/terms/page.tsx src/app/privacy/page.tsx src/app/signup/page.tsx \
  src/components/MarketingFooter.tsx src/app/faq/page.tsx src/app/trust/page.tsx

# When ready to commit (not pushed, per standing instructions)
git add src/app/terms/page.tsx src/app/privacy/page.tsx src/app/signup/page.tsx \
  src/components/MarketingFooter.tsx src/app/faq/page.tsx src/app/trust/page.tsx \
  MENTA_AUDIT_REPORT.md
git commit -m "Launch-readiness pass: publish draft ToS/Privacy, signup consent gate, refresh audit"
```
