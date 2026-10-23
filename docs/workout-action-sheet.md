# Workout action sheet

The Training library now opens a MENTA workout sheet instead of immediately marking a workout complete. Review the actual instructions and movements, then swipe or use the Start workout button. Check movements, record optional effort/notes, continue later, and finish with an explicit save.

## Behavior and boundaries

- `ActionSheet` is a reusable native HTML dialog with a rounded bottom presentation, focus containment, Escape/close handling, focus restoration, scroll containment, safe-area padding, and reduced-motion support. Large screens use a constrained floating sheet.
- Progress is versioned local browser storage scoped by signed-in user and workout. It survives closing the sheet and reloading this browser. It is **not cross-device sync**, and clearing browser data removes it. The interface explains this boundary.
- Device-storage failures are visible and prevent starting or sending an unpersisted completion. Corrupt progress requires retry or explicit clearing. If an unsaved device write fails during a workout, closing warns before losing those edits.
- A workout signature prevents old movement checkmarks from being reused after workout instructions change. An already-submitted completion retains its original details for safe confirmation retries.
- Each workout attempt gets a stable UUID. The completion API uses its existing primary key to deduplicate concurrent/repeated requests. It checks current access before returning an existing completion and rejects IDs reused for a different user/workout. Old callers without an ID retain their existing behavior.
- Save requests time out after 15 seconds. A failed/ambiguous response preserves the attempt and retry ID. Feedback locks once submitted, so a retry cannot silently change an already-recorded completion.
- Direct assignees can complete workouts already visible to them in Training. Templates must first be turned into a real workout. Malformed JSON is rejected.
- Completion history initially renders a deterministic date, then localizes in the browser, avoiding the server/browser locale mismatch observed during the acceptance run.

No database migration is needed. Marketing, Today, onboarding, team live-session behavior, health data, and native source files were not changed.

## Acceptance evidence

Verified locally against disposable PostgreSQL 18.4 and Chromium using real sessions and real API/database writes:

1. Review, keyboard dismissal/focus restoration, movement checks, notes/effort, close/reload/resume, and completion history.
2. A real database save with its response deliberately dropped; retry after reload records only one completion and causes no browser page errors.
3. Four concurrent completion requests record one row; another athlete cannot reuse its ID.
4. Workout edits invalidate old movement checks.
5. Authentication, access, malformed input, direct assignment, and template safeguards.
6. Incomplete/cancelled swipe does not start; completing the swipe does.
7. Responsive sheet checks at 1440, 820, 390, 360, and 320 pixels; reduced motion; corrupt and denied device storage.

All seven tests passed. Production build and targeted lint passed. Responsive screenshots were visually reviewed. These are Chromium viewport checks, not physical iPhone/iPad/Android or Safari/VoiceOver certification. The full pre-existing E2E corpus was not run.

Run the focused suite with `npx playwright test --config playwright.workout.config.ts`. It loads `.env` and needs a disposable PostgreSQL database configured in both `DATABASE_URL` and `DATABASE_URL_POOLED`, a `SESSION_SECRET`, and the existing migrations. Test cleanup is scoped to its generated users and workout IDs. Never run against production.

## Dependencies

Next.js and its lint config were updated from 16.3.1 to 16.4.2 after the existing installation reported critical advisories; compatible transitive patches were applied. The final production-only audit reported **zero critical and three high package alerts** (`prisma`, `@prisma/config`, `deepmerge-ts`), arising from the Prisma tooling dependency chain. npm lists Prisma 7.10.1 as the fix, a major migration requiring separate work. This is not a claim that the whole app is ready for public testers or has received a security audit.

## Native and future work

`Menta-iOS` main was inspected at `342bba59ed06c26a0040c4e84f84247c574e898a`. It has an iOS 18 SwiftUI iPhone/iPad target, local UserDefaults state, and static weekly sessions. No networking/authentication integration, WidgetKit extension, or watchOS target exists in that tree. It was left unchanged, and no Xcode build was possible on this Windows host.

Native parity needs an authenticated API client and shared workout lifecycle contract, a SwiftUI sheet and durable native attempts, and Xcode simulator/device tests. Widgets need a WidgetKit target, shared storage/app-group configuration, a timeline/update strategy, and navigation into the correct workout. Watch support needs a watchOS target, account/data synchronization, and a watch-specific interaction design; HealthKit permissions and capability configuration are needed only if health/workout recording is added. Signing, capabilities, and device validation require the Apple development environment.

Next product slices remain Today-screen clarity, goal-linked dated progress, contextual coach feedback, and appropriately permissioned shareable athlete profiles. None are represented as shipped by this change.

## Claude handoff

Focus on onboarding and Today-screen clarity. Inspect current main and this draft branch before starting; there is no evidence of another Claude implementation in this workspace. Preserve real assignment/session permissions and avoid fabricating coach instructions or schedules.

Files owned by this change: `TrainingView.tsx`, `ActionSheet.tsx` and its CSS module, `WorkoutSessionSheet.tsx` and its CSS module, `workout-draft.ts`, `/train/page.tsx`, the workout completion API, `validation.ts`, package manifests, the focused Playwright spec/config, `PRODUCT.md`, this document, and Next-generated `AGENTS.md` heading normalization.

Prefer separate Today/onboarding components. Do not rewrite the workout library, completion endpoint, validation schema, package versions, or sheet files in parallel. If Today needs a workout entry point, coordinate a small integration that reuses the workout lifecycle and user-scoped progress key. `globals.css`, all onboarding/Today files, and all native files remain untouched by this change.
