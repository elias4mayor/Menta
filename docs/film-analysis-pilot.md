# MENTA WR film analysis pilot

Use the supplied Releases, Agility, and Compression catalog as a content draft. The first automated observation is a coach-reviewed false step in a fixed-camera release rep. Record uncertainty and offer a review prompt when the view is occluded or the evidence is insufficient.

## Catalog and manual review

- Assign stable `coachingCueId` values to each cue. Define the referenced partner-jam and wall-freeze variations before shipping their progression links.
- Use a press-specific partner variation for the press-exit prescription. Keep the diamond/off-man drill under its own matchup. Match the solo athlete's equipment and ability in both the primary and alternative recommendations.
- Replace “ground force from phone video” with an observable such as plant-to-exit time or first exit step. Reserve force readings for validated instrumentation. Review exact body positions, effort, and contact coaching with a qualified coach before publishing. Verify the supplied source references before treating them as documented scouting criteria.
- Add manual timestamp, selected athlete, cue ID, optional box, and coach review status to the existing film workflow. The existing `FilmAnalysisEntry` remains a coach assessment. Start the reference set with two coaches independently tagging the same clips and resolving disagreements.

## Implemented callback contract

`POST /api/internal/film-analysis/:jobId/result` is disabled without a configured `FILM_ANALYSIS_WORKER_SECRET` of at least 32 characters. Supply it to the trusted worker as a bearer credential. The callback takes one strict report with `schemaVersion: 1`, `modelVersion`, and an `events` array. Each event has absolute source-video `startMs`, `endMs`, and `frameMs`, a marker, confidence, approved `coachingCueId` or null, and normalized frame boxes for body segments. Use the top-left origin after rotation normalization. Confidence is a model output and should be calibrated against labeled clips.

A trusted dispatcher must create the job with the authorized film, subject, requester, clip window, and cue allowlist. The callback rejects out-of-scope timestamps and cues, checks the requester's current access, and stores one draft and one requester notification in a transaction. Replays return `duplicate`. The notification opens the existing permission-checked film page at the clip start. The job dispatcher, worker, draft review UI, publication flow, and APNs sender are follow-up work.

## Worker and publication plan

1. Queue a job ID after an explicit coach request. The worker resolves a short-lived grant to the approved stored object. Accept opaque object references from the dispatcher. Avoid fetching user-controlled URLs. Resolve permissions again before publication.
2. Run decoding and inference in an independently scaled worker near the media store, with bounded clip length, bytes, decoded pixels, and concurrency. Decode using original presentation timestamps. Run a sparse tracking pass, then select denser windows around movement transitions and the snap or release. Measure clip turnaround, decode, and inference separately. Keep decoding and raw media transfer off the Next.js request handler and the Forge path.
3. Use specialist tracking and pose estimation for boxes and landmarks. Pass selected frames, timestamps, view quality, and the approved cue list to the reasoning model. Check the report against the contract, then submit it to the callback. Keep 2D estimates separate from calibrated spatial measurements.
4. After a coach approves a correction, dispatch an idempotent notification via an outbox. Use quiet in-app delivery by default and reserve an interruption for an explicit, time-sensitive coach assignment. A current Live Activity can show “Film feedback ready” and open an authenticated review route. Add a corrective drill link when a real catalog route and approved mapping exist. Keep technique details and biometric values in the signed-in app.
5. For wearable data, correlate consented samples with the same athlete and session using capture timestamps, device clock offset, and a join-quality flag. Surface co-occurrence with caveats for camera angle, workload, drill context, and missing data. An observed slowdown and a higher wearable load can prompt coach review. Neither establishes the cause or a clinical status.

Queue workers must be safe to retry. See [Vercel Queues concepts](https://vercel.com/docs/queues/concepts). Test ActivityKit delivery independently, including its update budget and device permissions. See [Apple ActivityKit push documentation](https://developer.apple.com/documentation/ActivityKit/starting-and-updating-live-activities-with-activitykit-push-notifications).

## Merge and performance gate

Keep this on a separate film branch. Apply its additive migration only on disposable PostgreSQL during verification. Test unauthorized callbacks, duplicate delivery, malformed boxes, a mismatched cue, and revoked film access. Keep the worker off by default until those checks and a manual review flow pass. Run the unchanged Forge 100-write, 20-rack benchmark on the same candidate revision. Then repeat with film traffic under a bounded worker concurrency before enabling it in staging. The prior Forge run encountered an HTTP 500 and did not produce a p95.
