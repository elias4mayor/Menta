# Multi-sport onboarding and MENTA Sideline
Date: 2026-10-19
Status: proposed product scope; no application features implemented by this document.

## Product direction
Provide one shared athlete workspace with sport-, discipline-, level-, and role-specific modules. Support independent athletes, multiple sports, multiple organizations, Olympic and Paralympic pathways, and professional teams.

## Adaptive onboarding
Collect role, sport(s), discipline/event/position, competition level, country, governing body, organization memberships, goals, accessibility needs, and consent-based staff access. Ask progressively; permit independent use and later edits. Avoid requiring school enrollment for adults or independent athletes. Store official classification records without inferring classification.

## Shared foundation
Calendar and conflict handling; communication; training logs; film; documents; appointments; travel; equipment; competition preparation; source-dated requirements. Separate organization permissions and medical permissions. Support multiple-team workload visibility only with authorized sharing.

## Initial sport feature catalog (proposals)
| Sports | Specialized workflows |
| --- | --- |
| Football | Position groups, playbook assignments, reps, annotated film, equipment |
| Soccer/futsal/rugby/field hockey/lacrosse | Lineups, set plays, minutes, position film |
| Basketball/netball/handball | Shot charts, rotations, possession review |
| Baseball/softball | Distinct pitching workflows, bullpen/throw logs, batting and fielding film |
| Volleyball/beach | Rotations, serve receive, jump logs, partner schedules |
| Ice hockey | Lines, shifts, ice bookings, equipment maintenance |
| Boxing | Fight camps, rounds, sparring logs, bout records, paperwork deadlines |
| Wrestling/judo/taekwondo/fencing/martial arts | Separate scoring, divisions, brackets, partner and equipment coordination |
| Swimming | Stroke/distance/course-specific results, splits, relays, sourced entry standards |
| Track/field/cross-country | Events, attempts, splits, implements, relevant wind readings, qualification |
| Rowing/canoe/kayak | Boat/seat assignments, crew availability, splits, equipment booking |
| Cycling/triathlon | Discipline sessions, power/pace, transitions, maintenance |
| Gymnastics/diving/figure skating/artistic swimming | Routine versions, skills, rule-version selection, coach review |
| Racket sports | Serve/rally review, draws, courts, doubles coordination |
| Golf | Yardage, dispersion, club distances, tournament preparation |
| Weightlifting/powerlifting | Separate rule sets, attempts, totals, warmups, lift video |
| Climbing | Routes/problems, attempts, discipline goals, rounds |
| Archery/shooting | Distance-specific scores, setup, grouping, equipment |
| Sailing/surfing | Crews/heats, conditions, equipment, travel |
| Winter sports | Discipline-specific timing/judging, tuning, venues |
| Equestrian | Rider/horse records, care coordination, travel |
| Para/adaptive sports | Official class/status, review dates, access needs, guides/pilots, adaptive equipment |

This catalog is not a completed requirements audit for every sport. Validate each module with practitioners before making coverage claims.

## MENTA Sideline pilot
Tablet-first workspace with Review Plays, Coach Adjustments, and My Assignments.
1. Coach selects authorized footage or image.
2. Coach annotates a moment and assigns it to a permitted position group.
3. Athlete sees the assigned adjustment and acknowledges or asks a question.
4. Staff distinguish delivery, opening, and acknowledgment; no invented read receipts.

Use large touch targets, minimal typing, timestamps, accessible contrast, and explicit pending/error states. Cache only authorized content with visible freshness; live synchronization requires connectivity. Revoke access on logout/account changes and define cache expiration before enabling offline private film.

Start with practice and preloaded review. In-game mode requires verification of competition-specific rules, footage rights, permitted devices, and venue/network constraints. No assertion of live feed integration, league approval, automated medical clearance, or unrestricted real-time coaching.

## Implementation sequence
1. Inspect current schemas, permissions, film and team APIs; reconcile open PRs.
2. Add configurable sport/discipline onboarding with migrations and backwards compatibility.
3. Build tablet home and authorized play review behind a feature flag.
4. Add group assignments, annotations, acknowledgments, and audit events.
5. Add offline behavior only after cache/security design and device testing.
6. Validate football plus boxing, swimming, rowing and a Para discipline before wider rollout.

## Acceptance and verification
- Existing accounts continue to work; multi-sport and independent athletes can onboard.
- Server enforces organization and position-group membership; test cross-team denial.
- Unauthorized users cannot fetch clips, annotations, documents or cached private media.
- Coach assigns a play; correct athlete receives it; acknowledgment persists after refresh.
- Failed delivery, unavailable footage, stale cache and network loss have truthful UI.
- Test tablet portrait/landscape, touch, keyboard, screen reader and reduced motion.
- Run repository lint/type checks/build and relevant E2E with required test environment.
- Run dependency and secret checks; triage findings instead of applying force upgrades.
- Record exact commit, commands, outcomes, skipped checks and blockers.
- Require passing applicable checks and reviewed changes before merging/release.
- Maintain rollback path. No test suite guarantees zero failures.

## Research sources
Sources consulted 2026-10-19; verify current rules per athlete and event before implementation.
- USA Boxing passbooks: https://www.usaboxing.org/membership
- USA Swimming standards: https://www.usaswimming.org/times/time-standards
- USA Swimming performance records: https://www.usaswimming.org/times/popular-resources/
- World Gymnastics discipline rulebooks: https://www.gymnastics.sport/site/rules/
- IPC sport-specific classification: https://www.paralympic.org/classification
- USADA testing-pool whereabouts: https://www.usada.org/testing/whereabouts/
- MLB youth pitching/rest across organizations: https://www.mlb.com/pitch-smart/pitching-guidelines/ages-15-18
- World Rowing rulebooks: https://worldrowing.com/technical/rules/

## Repository review snapshot
Read root AGENTS.md and package.json, repository root/tree, latest five workflow runs, and first ten open pull requests on 2026-10-19.
Open PRs observed: #2 billing; #3 AI coordination; #11 dashboard; #12 iOS live workout; #13 academic connections; #14 mobile/team operations; #15 training.
Latest listed E2E: success on codex/ios-auth-membership-bridge, commit 289ee0c8d5271ba2d1de19f99dc4900257e1bc4a.
That result applies to that commit, not a full main-branch audit.
No local tests, dependency audit, secret scan, build, or end-to-end product validation have been completed for this proposal.
