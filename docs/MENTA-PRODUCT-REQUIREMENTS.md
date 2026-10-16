# MENTA product requirements — current user direction

This file records accepted requirements, not a statement that the product is launch-ready.

## Brand and interaction

- Native iOS 18+, iPhone and iPad; website and app share accounts and authoritative server data.
- Matte black, white, charcoal; San Francisco system typography. Original website logo with the crossbar in A. The later uploaded crossbar-free logo is superseded.
- Brief original-logo fade and light sweep on black at cold launch; smooth restrained screen changes. Returning sign-in gets a brief welcome; new accounts reuse the website welcome sequence and onboarding.
- Current user explicitly requests subtle glass bubbles for dashboard metrics. This supersedes the earlier no-glass rule only for restrained bubble surfaces; avoid the previously rejected excessive glass treatment.
- Workout countdown on Lock Screen and Dynamic Island via ActivityKit. Local timers must survive suspension and restore correctly; fully powered-off devices do not display them.

## Training

- Training opens to useful actions, not only a read-only workout list.
- Search exercises, add them directly to a draft, edit sets/reps, reorder/remove, save, then run the workout.
- Generate an editable sport/position starter, with the real athlete context visible. Never invent recorded results or silently prescribe maximum loads from height/weight.
- Sport, position, height and weight belong in onboarding on the website and app. Prefer selectable/searchable choices. Include boxing and a broad sport registry, plus an escape hatch for unlisted sports.
- A dedicated measurements/testing area: 40-yard dash, sprint splits, shuttle, jumps, lifting records, and other personal bests; correct units and lower-is-better timing records.
- Team weight-room use: structured programs/blocks, station groups, membership changes, athlete prescriptions, live work/rest timing, per-set results, attendance, progress summaries, reports, and coach-controlled permissions.

## School and family

- Reduce unnecessary typing across onboarding and daily forms. Keep exact numeric inputs for precise testing results, and search school data rather than inventing school records.
- Academic tracking, assignments, eligibility, and support alerts must work end to end.
- Notify authorized coaches/supporters when a student needs academic attention; do not distribute private grades merely because someone calls themselves a coach or parent.
- Parent access must use approved athlete/guardian relationships and a clear child-specific view.
- Clearly distinguish self-reported data from actual school integrations. District/SIS connectivity is not implied by a grade tracker or by Google sign-in.

## Accounts and membership

- Email, Google and Apple sign-in; shared web/app membership state; Stripe where permitted and explicitly enabled. Provider secrets remain server-side.
- Apple Developer enrollment and live provider/checkout tests remain external launch dependencies.
- All existing MENTA sections remain reachable. Teamworks, Hudl, NCSA, sportsYou and RackCoach describe the desired breadth; no affiliation or interoperability is implied.

## Research: public RackCoach feature coverage

Sources reviewed: [official features](https://rackcoach.com/features/), [official overview](https://rackcoach.com/), and [publisher App Store listing/history](https://apps.apple.com/us/app/rackcoach/id1060795832). Public evidence does not establish every feature behind a paid login.

| Documented capability | Existing MENTA foundation | Work still requiring verification or implementation |
| --- | --- | --- |
| Work/rest audiovisual timing and group displays | TrainingSession, TrainingGroup, advance endpoints | Native entry and device/background behavior; audio and synchronized multi-user tests |
| Workout creation, storage, distribution | Workouts, structured team programs and prescriptions | Direct native exercise builder and clear live launch |
| Athlete progress, reporting and leaderboards | PerformanceEntry and per-set training ledger | Native testing view, direction-aware PRs, team reporting visibility |
| Attendance and station-oriented workflows | Team session/group APIs | Verify attendance coverage rather than assuming group membership means attendance |
| Practice plans, depth charts, calendar, messaging | Separate existing MENTA team/calendar/message sections | Audit each complete flow and role before declaring parity |
| Coach collaboration and courses | Existing team workflows; no verified equivalent for all public community/course features | Explicit gap; do not label complete |

MENTA implementations should use original interface and code. Research informs workflows; it is not permission to reuse another company's artwork, code, or private content.

## Validation gates

Native: iPhone and iPad builds/tests, workout draft/save/run, pause/resume/expiry/relaunch, account switching, Reduce Motion and Reduce Transparency, real-device Lock Screen/Dynamic Island checks.

Server: schema/type/lint checks; authorization, isolation, validation, onboarding retry behavior, correct PR comparison, academic sharing/revocation, notification deduplication, coach/group permissions, and end-to-end browser/API/database checks.

Passing compilation does not establish live provider setup, district integration, payment correctness, or complete competitor parity. Record unverified areas honestly.

## Expanded product direction

The user confirmed a connected platform spanning academics, athletics, health, communication, and recruiting. Keep the approved clean athletic/Apple Health visual feel. This list is a delivery backlog, not a claim of live capability.

- Real-time direct/group messaging, voice commands, team/community updates and celebrations.
- Team schedules, calendar syncing, travel itineraries/logistics, offline travel access.
- Important-only push notifications, secure file sharing, custom organization branding.
- Coach analytics, interactive film/video feedback, goals, earned progress badges and achievements.
- Personalized AI training and academic suggestions; adaptive coaching with explicit review/constraints.
- School-system integrations, academic support and tutoring, wearable/health integration.

Current implementation focus: team hub, official announcements, categorized schedule creation, roster/subgroup code joining, role-aware setup, permission-safe messaging, and opt-in academic support signals. In-app notification records are not device push delivery. Google Classroom is an existing explicit connection, not general SIS/district interoperability. Existing provider-backed AI is not adaptive real-time coaching. Wearables, voice, offline sync/conflict handling, background push delivery, tutoring services, multi-leg logistics, organization theming, community moderation, and earned-achievement rules need distinct implementation and verification.

Teamworks public baseline reviewed: https://teamworks.com/hub and https://help.teamworks.com/support/s/athlete-resources . Documented areas include news, messaging, calendars, tasks, files/forms, travel and roster management. Public documentation does not establish all private product behavior or imply interoperability.

The adaptive-coach direction is explicit: use consented wearable data, the athlete's training plan, schoolwork, and real schedule to suggest training, rest, and study actions. Recommendations must identify their data source and freshness, retain athlete/coach control over plan changes, and support reminders without fabricating health measurements or silently changing prescriptions. This is a future feature specification; no wearable feed or dynamic coaching engine is connected by the team-hub update.
