# MENTA AI Task Board
Updated: 2026-10-15. This is a lightweight coordination board; GitHub issues/PRs are authoritative for technical status.

| ID | Priority | Task | Owner | Status | Evidence / next gate |
| --- | --- | --- | --- | --- | --- |
| COORD-001 | P0 | Propose shared AI coordination docs | ChatGPT | Draft PR | Review this documentation-only PR; do not merge automatically |
| VALID-001 | P0 | Conduct non-leading parent interviews | Founder + Perplexity research support | Not verified started | Record dated interviews, exact quotes, alternatives; no sensitive student records |
| VALID-002 | P0 | Verify qualified reviewer and readiness-review methodology | Founder | Open | Obtain qualified review before paid report delivery |
| VALID-003 | P0 | Validate three offer concepts and prices | Founder + Perplexity | Planned, not launched here | Confirm truthful terms, privacy, payment/refund workflow; record actual transactions |
| BILL-001 | P1 | Review Stripe billing-hardening draft PR #2 | Claude implementation; ChatGPT review | Draft PR open at setup | CI plus manual sandbox checkout/webhook/refund tests; no merge or deploy |
| TECH-001 | P1 | Verify actual staging, authentication, and minor safety gates | Unassigned | Not started | Inspect deployed behavior and code; log findings in a separate issue |
| IOS-001 | P1 | Fix CI on iOS Live Activity draft PR #12 (feat/ios-live-workout) | Claude | Done | Merged current main to pick up DATABASE_URL_POOLED CI fix (838e298); verified tsc/eslint/build/e2e (141/141 runnable) locally before push; Swift/Xcode side still unverified (needs a Mac). Founder reviewing before merge. |
| TRAIN-001 | P1 | Training screen redesign: 3 entry points (Build Workout / Team Weight Room / Log Measurements) | Claude | In progress | Branch `feat/training-screen-redesign` off main (post-#12). Reuses existing TrainingProgram/ProgramExercise/AthletePrescription/TrainingSession/TrainingGroup/TrainingSet/PerformanceEntry models and Workout/TrainingView/PerformanceView/WorkoutGenerator components — no new parallel system. Scope: src/app/(app)/train/**, src/components/TrainingView.tsx (+ new entry components), src/app/(app)/performance/**. Does not touch feat/ios-live-workout, Stripe, or academics work. Acceptance: tsc/eslint/build clean, new e2e coverage for the 3 entry points, screenshots before PR. Founder approval required before merge.

## Assignment rule
Before working, record: issue/ID, agent, exact scope, branch, files expected, acceptance criteria, verification method, and founder approval for writes. One implementer per branch. Avoid concurrent changes to the same files.

## Status language
Use **planned / in progress / blocked / draft PR / verified / done** accurately. An opened PR is not a completed deployment. CI green is not equivalent to live payment verification.

## Next founder decision
Review COORD-001, confirm who maintains this board, and decide whether to adopt this workflow. Keep the Stripe PR independent.
