# MENTA production readiness manifest

## Verified baseline and release gaps

| Check | Evidence and status |
| --- | --- |
| Web PR #27 | The earlier web revision `67d5495abe671a7653408221e346858822264241` passed a production build and 25 targeted Playwright tests against disposable PostgreSQL. Those tests cover assistant naming and existing live-session behavior. |
| Assistant name | Web saves the approved name in `User.aiCoachName` through `PATCH /api/ai/name` and uses it in AI Coach, Study Help, and the web Island. The native default branch has no name picker or API mapping. Its foundation branch links to the hosted coach page. Native parity needs an authenticated read/write flow against the same account. |
| Forge | The web rack display uses a four-second room poll and a local one-second display tick. The native foundation branch has a local ActivityKit workout timer. Sub-second Forge delivery and native set synchronization require separate implementation and measurement. |
| Film | Web authorizes the film page and media request, then seeks to the shared `t` after video metadata loads. A seek to a timestamp does not verify frame-exact decoding. The native foundation branch links to the hosted film workspace. Incoming native timestamp handling and signed-in playback remain a separate test. |
| Database migration | The additive `User.aiCoachName` migration applied successfully during the earlier disposable PostgreSQL run. The [web audit’s migration step](https://github.com/elias4mayor/Menta/actions/runs/42610210449) passed candidate deployment, snapshot restore after a forced failure, fixture and migration-history checks, and redeployment on disposable PostgreSQL. |
| iOS build | The [private iOS audit](https://github.com/elias4mayor/Menta-iOS/actions/runs/42610218476) passed an unsigned simulator build for the audit PR. This verifies the build, while feature parity remains open. |
| Uniform Election | [Phase 1 configuration](docs/uniform-election.phase1.json) is a proposed contract. Implement ballot authorization, inventory validation, and transactional finalization before enabling it. |

## Legal and policy review

- **Modified copy:** The recruiting FAQ now describes organizing outreach and directs users to their school or college compliance staff for contact rules. It previously implied the app handled NCAA contact-period compliance.
- **Brand review:** Code matches are an inventory for review. Existing integration identifiers and ordinary references retain their meaning. Visual assets and any use of third-party marks need a separate rights review.
- **NIL:** The web audit did not locate an existing contract parser to modify. Before implementing submissions, require staff-configured exclusivity rules with school, category, brand, effective dates, and evidence. A potential match opens an authorized review task and holds submission until review. Avoid claims that a match decides compliance.

Review references:

- [Texas UIL Constitution and Contest Rules](https://www.uiltexas.org/policy/constitution)
- [Texas UIL eligibility rules, including Section 441](https://www.uiltexas.org/policy/constitution/general/eligibility)
- [NCAA name, image and likeness guidance](https://www.ncaa.org/student-athletes/name-image-likeness/)
- [USPTO trademark infringement overview](https://www.uspto.gov/page/about-trademark-infringement)

## Uniform Election release test

Use an approved kit poll with three options. A team member can change one ballot until the server deadline. In a single database transaction, finalize the chosen kit, upsert one packing ticket keyed by poll ID, upsert the event's Fit Check revision, and append a uniquely keyed outbox event. Send the team update after commit. A tie or unavailable kit returns to staff review. Replay the finalization request and verify that it creates one ticket and one announcement.

## App Store draft

| Field | Proposed copy |
| --- | --- |
| Name | MENTA |
| Subtitle | Know your next move |
| Promotional text | Know your next move. See what’s on today, plan your training, and build routines that fit your season with MENTA. |
| Keywords | athlete,training,workout,schedule,routine,mindset,recovery |
| Screenshot sequence | See what’s on today · Follow your training · Build your routine |

Confirm each claim and screenshot against the actual native release candidate. Add assistant naming, Forge, and film only once they are available and verified in that binary. See [Apple’s platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information).

## Release gate

Review the exact web and native run revisions and record the migration rehearsal outcome before promotion. Deploy the database migration before serving the web revision that uses the new column. Keep real account, academic, and performance records outside the rehearsal.

## MENTA feature names

| Area | Names |
| --- | --- |
| Mindset | Circle, Safe Room |
| Excellence | Radar, Ledger, Match |
| Nutrition | Fuel, Expo |
| Training | Forge, Sideline, Drip |
| Academics | Timeline, Matrix |

Matrix is the tutoring feature. Each athlete can still choose their assistant's name. Proposed tab labels for Fuel, Expo, and Drip depend on those features being available in the release.

### App Store screenshot placeholders

Use only the ones the native release candidate supports. Show the actual screen and keep the copy tied to the interaction shown.

| Feature | Headline | Caption |
| --- | --- | --- |
| Timeline | Know your next move. | See what’s on today and what’s due next. |
| Circle | Take a moment to reset. | Read a short prompt and reflect at your own pace. |
| Sideline | Find the play you need. | Open a shared film moment from your coach. |

Coach audio, live sideline adjustments, and native timestamped film access need release-candidate verification before they appear in App Store copy.
