# MENTA web and iOS coordination contract
Version: 1. Date: 2026-10-19. Status: proposed coordination policy, not implemented synchronization.
Repositories: elias4mayor/Menta (web and server), elias4mayor/Menta-iOS (native client).
Keep this version identical in both repositories. A future automated contract check is planned, not installed.

## Ownership
| Concern | Web/server repository | iOS repository |
| --- | --- | --- |
| Identity, authorization, paid entitlements | Authoritative server validation and web UI | Native sign-in and secure session handling; consume server decisions |
| Sport catalog and requirements | Canonical stable IDs, disciplines, categories, sourced/versioned requirements | Consume compatible catalog; avoid an independently growing hardcoded list |
| Athlete, team, calendar, film, assignments | Shared API and web workflows | Native views consuming the same authorized records |
| Medical and private wellness data | Explicit permissions and consent-specific storage | Preserve local-only data unless user explicitly requests supported synchronization |
| Marketing/SEO/public website | Web only | Deep-link to relevant pages when useful; do not copy marketing into athlete home |
| Database, migrations, secrets, webhooks | Server only | Never embed credentials, Prisma, server SDKs or secret billing logic |
| Live Activities, widgets, APNs, HealthKit | Supporting server endpoints where needed | Native capability with explicit permissions; not required on web |
| Tablet sideline | Shared record model, access rules and browser tablet UI where useful | Native iPad review, annotations and assignments using the same contract |

## Definition of feature parity
Same supported account, records, terminology, permission outcomes and core task results. Layout, navigation, input and device integrations may differ.
Each feature change records web/server impact, iOS impact, API compatibility, migration, tests, rollout and rollback.
A platform exception must explain user benefit and replacement flow. Never silently remove a feature because its implementation is inconvenient.
Paired work must link counterpart PRs. Backend must remain compatible with installed older iOS versions; add fields safely and version breaking changes. Account separation is enforced on the server.
Deploy server changes before clients that depend on them, behind a capability flag. A shipped native client must handle unavailable capabilities gracefully.

## Design relationship
Use the same logo, feature names, hierarchy, content grouping and semantic states.
Honor current native branch instructions: matte black/white/charcoal with glass confined to navigation; do not overwrite that direction with web CSS.
Observed web main uses a white default; native main uses black/mint; native foundation branch uses black/white. These are documented differences, not resolved parity.
Use explicit light/dark semantic token mappings and matched screen reviews before claiming visual consistency. Keep native system controls, Dynamic Type, VoiceOver, reduced motion and reduced transparency.
Do not copy React/CSS into SwiftUI or Swift code into the Next.js server.

## Observed gaps and priorities
1. Native main AppState uses local UserDefaults and sample training sessions; it is not evidence of server data synchronization.
2. Native main onboarding has seven sport choices including Other; web already has src/lib/sports.ts and sport-context workflows. Reuse the established domain model before creating a new one.
3. Web PR #14 and native PR #1 contain ongoing integration work; inspect their latest diffs before implementing overlapping auth, navigation or theme changes.
4. Reconcile authentication and explicit private-data consent before enabling cross-device writes.
5. Validate a paired vertical flow: sign in on both, authorized sport change, shared assignment, acknowledgment, refresh and sign-out/account isolation.
6. Add Sideline only after existing film/team permissions and API shapes are verified.

## Release checklist
- [ ] Paired feature or justified platform exception is identified.
- [ ] API request/response/error schemas and stable sport IDs match.
- [ ] Web lint, types, build and relevant E2E pass on exact candidate commit.
- [ ] iOS test script runs on macOS; iPhone and iPad validated.
- [ ] Auth expiry, cross-account denial, network loss and capability fallback tested.
- [ ] Private data consent and cache clearing behavior verified.
- [ ] Dependency/security findings triaged; no claim of complete safety from a scan.
- [ ] Design reviewed on matched screens; platform differences documented.
- [ ] Linked PRs record exact revisions, test evidence and rollback.
- [ ] No merge/release claim until required checks and review complete.

## Review limitations
Repository and selected source/CI inspection only. No complete security audit or full product parity certification. iOS cannot be compiled in this Linux environment. Documentation synchronization does not synchronize application behavior.
