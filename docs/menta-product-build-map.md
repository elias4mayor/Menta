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
