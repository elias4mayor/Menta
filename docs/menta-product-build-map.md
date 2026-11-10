# MENTA product build map

**Product promise:** Know your next move. The first release should give an athlete and their coach a reason to use MENTA again next game week. The website and web app are the first delivery surfaces. iOS extensions and external integrations each need their own verification.

## Existing foundation and this change

| Area | Data keys and entry points | This change |
| --- | --- | --- |
| AI Coach | `User.id`, `User.aiCoachName`, `AIConversation.userId` · `PATCH /api/ai/name`, `POST /api/ai` | Approved-name picker, account persistence, reset, and the chosen name in the coach chat and web Island. |
| Study Help | `AthleteSportContext.userId`, `isActive`, `isPrimary` · `POST /api/academics/study-help` | Teach with the athlete's primary sport and one reasoning step at a time. Evaluate for answer leakage before making academic-integrity claims. |
| Film | `Film.id`, `Clip.startSec`, existing film access checks · `/film/:id?t=:seconds` | Share a link to a video moment. The viewer must already have film access. |
| Forge | `TrainingSession.id/teamId`, `TrainingGroup.id/sessionId`, `TrainingGroupMember.sessionId/athleteId`, `TrainingSet.programExerciseId/loggedAt`, `ProgramExercise.restSec` · `GET /api/teams/:teamId/sessions/:id` | Read-only room and rack displays, with rest countdowns derived from set logs. |
| Navigation | Signed-in user role and existing authorized routes | Five mobile slots with Home, Inbox, and Profile in fixed positions. |
| Launch website | `/` and the existing signup flow | “Know your next move” and a labeled sample athlete day. |

## Proposed next interfaces

Names below are proposed. They describe contracts to implement and verify before enabling each feature.

| Area | Proposed records and keys | Trigger and acceptance check |
| --- | --- | --- |
| Team Huddle and travel | `TeamUpdate(id, teamId, calendarEventId, revision)`, `UpdateAcknowledgment(updateId, revision, userId)` | Save a schedule revision and fan out only to authorized recipients. A new bus time invalidates the previous acknowledgment and appears on the calendar and athlete home. |
| Notification routing | `NotificationDelivery(eventId, userId, channel)` unique per delivery | Use explicit audiences and recheck access on open. A revoked staff member opening an old alert cannot read the record. |
| Digital Locker | `GearRequest(id, teamId, athleteId, itemId, neededBy, status)`, `GearFulfillment(requestId, staffId, stagedAt)` | Create a request, confirm stock and fit, then scan for pickup. A repeated request cannot create a second open ticket for the same action. |
| Nutrition and travel meals | `MealOrder(id, athleteId, menuWindowId, revision)`, `MealTicket(orderId, revision)`, `TravelSeat(tripId, athleteId)` | The dietitian approves changes. The kitchen acknowledges the current revision before handoff. Seat labels use only the details needed to deliver the meal. |
| Care and return to play | Restricted `CareRecord`, `ClearanceDecision(athleteId, effectiveAt)`, and a separate `ParticipationStatus` | Staff publish effective status after required review. Team Operations receives only the authorized status and participation limits. Use simulated records until deployment controls and school requirements are verified. |
| Mindset and Culture | `CulturePost(id, teamId, authorId)`, `CulturePoll(id, closesAt)`, private `PersonalIntention(userId, localDay)` | Participation is optional. Team posts and polls stay separate from private reflections and requests for support. |
| Private support | Restricted `SupportRequest(id, athleteId, assignedProviderId)` | Enable with a designated provider and documented coverage. Role changes remove access. A separate voluntary path can route to a chaplain. |
| Recruiting | `RecruitProfile(athleteId)`, `VerifiedMetric(profileId, source, measuredAt, method)`, `RecruitShareGrant(profileId, recipientId)` | Athletes control sharing. Show measured, self-reported, and missing values separately. Distinguish sourced roster observations from staff-confirmed program needs. |
| NIL scheduling | `NILRequest(id, athleteId, reviewerId, status)`, `ProposedSlot(requestId, startsAt, expiresAt)` | Check free/busy, obtain athlete acceptance, then record required review before confirming. Keep academics and Care data outside sponsor access. |
| Game film and iOS | `FilmMoment(filmId, timeSec)` as the base for future chat references. Publish activity states from approved schedule, training, or gear events. | Test live collaboration in practice first. Competition deployment and native device behavior need separate verification. |
| Forge expansion | `RackSuggestion(sessionId, programExerciseId, revision)`, coach-approved group changes via current session-group APIs, and restricted approved training modifications | Preview grouping based on comparable working loads and equipment requirements. Coach confirms assignments. Display countdowns as cues. Keep medical details and approval decisions off shared screens. |
| Membership | Existing entitlements and subscription routes. Treat proposed prices as product decisions before changing billing. | Keep the free toolkit usable and profile sharing independent of payment. Exercise renewals, plan changes, and school seat assignment before rollout. |

Start the pilot with a schedule change, a shared film moment, and one live lift. Verify each as the coach and athlete, then test permission boundaries with an unrelated account.

## Athlete culture MVP

The first release pairs the athlete homepage with one staff approval queue. Test it with one varsity football position group during a game week. Keep the core training, schedule, film, and mindset tools usable on their own.

| Workflow | First UI and proposed API | Acceptance check |
| --- | --- | --- |
| **Mindset Circle** | Athlete Home rotates short quotes and opens a reflection prompt with a link to the existing private check-in. | The athlete can pause or advance the quotes. Opening a reflection holds the current quote in place. No team-facing mood score is created. |
| **Game-day music** | Athlete submits a track link and optional clean-version link. `POST /api/teams/:teamId/events/:eventId/song-requests` creates `SongRequest(id, eventId, athleteId, provider, trackRef, reviewStatus)`. Staff review requests on an event queue. | Staff can approve, decline, or reorder. Athletes see their own request status. The first release can share the approved list with event staff. |
| **Fit Check** | Equipment staff publish a base kit and available accessories on a game event. `PUT /api/teams/:teamId/events/:eventId/my-kit` saves `KitSelection(eventId, athleteId, revision)`. | A selection becomes a pack ticket once submitted. Staff can mark a kit packed and show pickup details. A revision made after packing returns the ticket to review. |
| **Media Vault** | Team media staff upload approved photos and manually tag roster members. `MediaAsset(id, teamId, eventId, storageKey)` and `MediaTag(assetId, athleteId)` drive each athlete's view. | A tagged athlete sees the approved asset and can download it. An unrelated athlete cannot open the file by copying its URL. External posting is an athlete action. |
| **Helmet stickers** | Later, add `BadgeAward(athleteId, badgeKey, sourceId, awardedAt)`, starting with a coach-awarded team badge and optional athlete display. | A repeated award event does not duplicate the sticker. Private school and wellness data stay outside team recognition. |

Defer automatic streaming and facility playback until the provider integration and usage rights have been verified. Defer smart-room controls, face matching, auto-tagging, and sponsor posting. Validate demand first through repeat song submissions, packed kit accuracy, and media downloads from the first game.

### Uniform Election

Start with three approved kit options in a single vote. Use existing product photos or staff-uploaded previews. The coach publishes the poll after equipment staff confirm availability. An eligible athlete can cast or change one vote until the server-side deadline.

- `UniformPoll(id, teamId, eventId, closesAt, status, winningOptionId, finalizedOptionId)` tracks the election.
- `UniformOption(id, pollId, kitId, previewAssetId)` references a prepared kit.
- `UniformBallot(pollId, athleteId, optionId)` is unique on `(pollId, athleteId)`. The team sees totals, and each athlete can see their own ballot.
- `PUT /api/teams/:teamId/uniform-polls/:pollId/ballot` validates roster membership, option ownership, and the deadline.
- `POST /api/teams/:teamId/uniform-polls/:pollId/finalize` confirms inventory, records the winning kit, and creates one equipment handoff keyed by poll ID. A tied vote or an unavailable kit goes to staff review.
- Once finalized, the team sees the confirmed kit in Live Status and the equipment manager sees the corresponding fulfillment ticket. Fit Check derives its options from that kit.

Pilot with a visible vote preview, a working countdown, a late ballot that is rejected, and a repeated finalize request that creates one ticket. Add multi-round brackets and a season-limited captain nomination after the single-round workflow has run for several game weeks. Any proposed override still goes through equipment confirmation.
