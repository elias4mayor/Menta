# Gate 2 backlog — blocked on Gate 1 verification

Execution order remains M08 → M10 → M09 → M12 after Gate 1 sign-off and PR #30 merge. These are design notes, not approved migrations or deployed features.

## M08 restrictions and drill constraints

Pin constraints to the immutable protocol version, not only the mutable Exercise. Define issuer/clearer authority before any endpoint. Separate restricted clinical notes into a separately authorized resource; do not rely on hiding fields in UI. Operational constraints apply across relevant team contexts without exposing clinical details.

Active means startsAt <= now, clearedAt absent, and endsAt absent or in the future. FULL_REST and NO_CONTACT need explicit behavior; an empty tag intersection must not bypass them. Recheck before acceptance and execution/submission as well as assignment creation, since a restriction can arrive later. A coach cannot override a restriction by recording a generic conflict resolution; approved substitutions must satisfy the restriction, and only a currently authorized practitioner can amend/clear it. Preserve versioned history and test concurrent restriction creation versus assignment. Missing equipment data stays unknown, not an assumed pass.

## M10 academics

Inspect existing academic models first; do not add duplicate AcademicTask tables blindly. Explicit academic read/write scopes are required; isPrivateToStaff is not authorization. Keep records out of recruiting responses at the API/query layer. Source timestamps, task durations and athlete timezone are necessary. A due date alone does not establish an overlapping study period. Show schedule conflicts, never an automated eligibility verdict.

## M09 workload

Hard identity should include athlete, source system and source account/device identity plus external record ID. Define updates to the same vendor record; silently skipping every collision can discard corrected data. Null external IDs need an ingestion key rather than relying on nullable uniqueness.

An overlap fingerprint is a review candidate, not proof of duplication. Bucket boundaries can miss duplicates, and simultaneous distinct activities can collide. Retain both raw imports and explicit provenance; reconcile into a canonical session with an audited decision. Do not automatically hide a flagged record from totals as though it were a confirmed duplicate. Show uncertainty until reviewed. Validate positive duration, RPE range, finite/nonnegative measured values, duplicate ownership and acyclic duplicate links. Unknown readings remain null; zero is valid only when actually observed.

## M12 recruiting

Use an immutable packet version with reviewed evidence and measurement snapshots. Mutable foreign-key references plus isVerified do not create a snapshot. Require exact athlete/sport/protocol alignment and the specific coach review record. Allow only explicitly approved provenance (COACH_ENTERED or SENSOR_MEASURED) in the verified section: provenance != SELF_REPORTED incorrectly admits MODEL_ESTIMATED. Store method, units, verification authority/time and uncertainty/calibration information where applicable; coach-entered is not automatically verified.

Use cryptographically random bearer secrets stored as hashes if anonymous links are eventually authorized; CUID is a record identifier, not a deliberate token design. Current Gate 1 recruiter access is authenticated and explicitly granted. Pin packet membership, expiry and revocation, and reauthorize every metadata/media request. Revocation blocks subsequent reads, not already downloaded files. No clinical, restriction or academic fields may be joined into packet payloads. Add allow/deny tests before any share endpoint.
