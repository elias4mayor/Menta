# Addendum to Claude's existing MENTA website work

Continue the work already in progress. This adds requirements; it does not replace the previous brief or authorize resetting existing changes.

## Ownership

| Owner | Scope |
| --- | --- |
| Codex | Native SwiftUI iOS, bundled preparation guide, native navigation/onboarding entry points, iPhone/iPad checks |
| Claude | Website UI, role-specific onboarding/dashboard flows, shared backend/data model, approved duties, live task/run-sheet APIs |
| Shared contract | docs/preparation-catalog.v1.json and docs/GLOBAL-PREPARATION-CATALOG.md |

The catalog covers every one of the current 63 SPORTS entries, including Other/custom, with complete sport-specific athlete/staff preparation. It includes 21 personas, 10 departments, 7 competition levels, universal athlete preparation and international setup. The native bundle is the same JSON content. Keep one reviewed source and synchronize content/version changes with native delivery rather than silently diverging the catalogs.

## Important existing gap

In the reviewed website source, dashboard dispatch explicitly handles COACH, TRAINER, PARENT and DOCTOR, then falls through to AthleteDashboard. TEACHER, STUDENT and STAFF therefore still need their own relevant dashboard dispatch/content. Native Home already has role-specific actions, so do not interpret the native fix as proof the website gap is solved. Recheck the latest code before changing it.

## Onboarding structure

Keep the existing eight public account identities: athlete, coach, parent, trainer, doctor, teacher, student and staff. Equipment, travel, operations, event administration, academic advising, scoring, media, student management and volunteering are approved responsibilities/specializations; selecting a preference never grants access. School/organization leadership remains an invitation/verification workflow. Public fans can browse published event pages without creating a private team account.

Start with country/region, language, time zone, sport/discipline, team/individual format, level, school/club and units. Collect only useful role-specific fields. Support multiple sports and approved team duties without duplicate identities. Retain athlete/guardian privacy and separate team roles from account roles. Local consent, participation, professional and classification requirements must be configured/reviewed for the actual jurisdiction and organizer.

## Website implementation

1. Present the catalog during the corresponding role onboarding as preparation guidance, and make it discoverable after setup. It does not itself complete onboarding or mark anyone ready.
2. Add a reviewed duty-appointment model controlled by actual team/organization authority; include scope, start/expiry, backup and revocation. Do not add broad staff access merely because someone selects Equipment or Media.
3. Build the private event run sheet with reusable locally reviewed templates, named owners/backups, deadlines, status, blockers, confirmation time and actor/version history. Leadership sees authorized operational exceptions, not invented readiness scores.
4. Athletes see their relevant reporting/kit/tasks; equipment sees packing/inspection/returns; transport sees itinerary/headcount/return; qualified care staff see authorized coverage/clinical work; academics sees permitted support tasks; media/scorers see their event scope. Keep clinical records and academic data in existing restricted workflows. A logistics checklist is not medical or eligibility clearance.
5. Use separate authenticated task APIs from public scores. Proposed endpoints for agreement: GET/POST `/api/gameday/:id/run-sheet`, PATCH `/api/gameday/:id/tasks/:taskId`. Publish the exact schema and authorization rules before Codex integrates native live task writes. Suggested fields: ID, event ID, department, title/instructions, owner ID, backup ID, dueAt, priority, status, version and actor/time history. Statuses TODO, IN_PROGRESS, BLOCKED, COMPLETE are task states only. Recheck current membership/duty scope on every read, write and export. Return no private tasks to fans. Revocation must stop subsequent access.
6. Support regional rule profiles, translations/RTL, time zones/DST, original result units, accessibility and age-appropriate safeguarding. Offline snapshots must be dated and isolated by account; do not claim live offline synchronization without implementing conflict/retry behavior.
7. Version new result formats. Track/swimming races, golf strokes, judged routines, sets, brackets, attempts and multi-stage events must not be forced into the current two-team integer-score API. Preserve v1 game-day compatibility while adding explicit format/capability negotiation. Do not imply unsupported formats already run live.
8. Retain the approved black MENTA design and original logo; keep forms readable and errors actionable. Complete the website's tap-to-start/Reduce Motion behavior from the original brief without introducing a compulsory long wait.

## Native boundary

Codex is publishing a reference guide accessible through Your MENTA, Team and native onboarding. It reads the bundled catalog, searches sports, shows role/level guidance and works without a connection. It does not change role permissions, save official task completion, certify eligibility or replace the website's authoritative onboarding/API. Avoid competing edits to native files.

## Verification

Validate catalog coverage against the canonical SPORTS registry and reject missing/duplicate sport mappings. Test each role's actual onboarding-to-first-action path, private task authorization, expired/revoked duties, guardian relationships, multiple teams, account switching, concurrent writes and public/private separation. Run TypeScript, relevant lint and real browser/API/database tests; inspect phone/tablet/desktop and Reduce Motion behavior. Review clinical/regulatory templates with the appropriate authorized organization before operational use.

Documentation/data updates alone do not establish completed backend functionality. Report implemented, tested, pending and externally dependent work separately. Do not reset branches, overwrite concurrent changes, run deployed migrations, merge or deploy production without explicit authorization.
