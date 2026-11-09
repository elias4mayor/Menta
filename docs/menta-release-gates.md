# MENTA web and iOS release checklist

This checklist applies to web PR #27 and the native parity work that follows iOS audit PR #3. The audit PR adds an unsigned build workflow. Record the exact web and native commits used in the staging test.

## Forge SSE contract

Use an authenticated one-way SSE stream with the existing HTTP mutations. Use a shared broker or durable event store so a writer and a subscriber served by different instances see the same committed event. Replace the room's interval refresh after the stream passes the staging checks below.

- **Room stream:** `GET /api/teams/:teamId/sessions/:sessionId/stream`, authorized for the existing room scope.
- **Athlete stream:** `GET /api/teams/:teamId/sessions/:sessionId/me/stream`, authorized for the authenticated participant. This projection carries only that athlete's assignment and progress.
- **Publishing:** Session transitions, group advances, and set logs persist a revision and an outbox event in the same transaction. A publisher relays committed events. Each projection sends its current snapshot on connection. Close subscriptions when their session or permission becomes invalid.
- **Reconnect:** Support `Last-Event-ID`. Replay available revisions in order, or send an authoritative snapshot if the cursor expired. Ignore duplicate and older revisions. Use SSE comment heartbeats and retain the last state with a reconnecting indicator. Avoid cache or proxy buffering.
- **Time:** Send server timestamps and the current deadline. Render the countdown locally and send a new event only when the authoritative state changes. Foreground iOS consumes the stream. ActivityKit uses its own deadline display and milestone updates.

Example athlete stream event. A snapshot uses the same shape with `event: forge.snapshot`. The numeric revision is monotonic per session. Values are illustrative.

```text
id: 42
event: forge.state
data: {"v":1,"sessionId":"s_123","revision":42,"serverTime":"2026-11-09T21:30:00.125Z","status":"LIVE","station":{"id":"g_7","label":"Rack 3","programExerciseId":"pe_4"},"athlete":{"completedSets":2,"targetSets":4,"restEndsAt":"2026-11-09T21:31:30.125Z"}}
```

Use `null` for an unassigned station, unavailable target count, or inactive deadline. Clear deadlines when a station advances, a session pauses, or the current plan no longer has an active timer. Room events carry a separately authorized `groups` projection.

**Staging gate:** On the same staging session, use a test rig to record the time from a committed web mutation to the foreground athlete view rendering the matching revision. Use a shared clock or account for measured clock offsets. Run at least 100 changes on the facility Wi-Fi, report p50/p95 and sample count, and target p95 below 200 ms. Separately measure lock-screen updates and label their observed behavior. Test reconnect, duplicate/out-of-order delivery, expired cursors, revoked membership, and concurrent set logging.

## Assistant and film parity

- Add an authenticated read path for the selected coach name, reusing the same canonical approved list and nullable reset value as `PATCH /api/ai/name`. Sign in as the same athlete on web and iOS, save on each platform, and verify the result on the other platform and in Study Help.
- Use `/film/:id?t=:seconds` as the canonical HTTPS link. On iOS, handle the link after authentication or route to the hosted player with the query intact. Test signed-out sign-in return, valid and malformed timestamps, revoked access, and direct media access. Check seek position using a known test video.

## Uniform Election

- `uniform_poll_votes` enforces one ballot per `(poll_id, athlete_id)` and a composite reference that ties the option to its poll. The server checks team membership and deadline inside the ballot write.
- Closing a vote records the result. An authorized finalization locks the poll row and verifies the kit's availability. A database trigger on the transition to finalized upserts exactly one `equipment_packing_tickets` row per poll with the winning kit ID. Ties and unavailable kits go to staff review.
- Existing `drip_accessory_presets` remain personal preferences. Scope the allowed accessories to the finalized game kit and validate selections on the server using approved accessory IDs. The same finalization transaction updates the event's Fit Check revision and writes the outbox record for team notifications.
- Test concurrent finalization, repeated delivery, late votes, cross-team votes, and stale accessory selections. Use the [phase 1 configuration](uniform-election.phase1.json) as the proposed product contract.

## Merge and staging order

1. Record passing web and iOS parity checks and the same-session latency report. Verify each App Store claim against the native release candidate. Keep transcript verification, plagiarism, and sub-second lock-screen claims out of the launch copy until supported.
2. Approve the staging migration and recovery plan. Apply the additive migration to staging before serving code that reads the new column.
3. Promote the verified web API, then the dependent native build. Recheck both as the same signed-in user. Use a release window and pin both commits so the two promotions can be tracked independently.
