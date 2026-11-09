# Forge SSE staging latency test

This Playwright template measures **database pre-commit sample to foreground browser post-frame observation** for 100 concurrent requests. It exercises the real browser's SSE client and UI rendering. Use the same event correlation and synchronized-clock method in a native iOS test before claiming native parity. Measure ActivityKit separately.

## Staging adapter

1. Seed a disposable team and session with independent mutations. Use distinct sets, racks, or sessions where appropriate. Preserve all 100 intended commits so the test measures delivery under concurrency, rather than contention from repeated writes to a single set.
2. Set `FORGE_PERF_ENABLED=1` on the staging server and use the authenticated Forge room display at `/team/:teamId/sessions/:sessionId/display?perf=1`. Use the full room so all tested racks are represented. The display becomes ready after its first authorized SSE snapshot. For each tracked ID, it records `forge:<id>:receive` at SSE receipt, `forge:<id>:commit` after React commits the update, and `forge:<id>:frame` at the second animation-frame callback. This observes a frame opportunity and does not measure actual pixel paint. Coalesced snapshots can mark multiple IDs at the same commit and frame.
3. Use the existing authenticated Forge mutation routes. Each returns `forgeMutation: { correlationId, recordedAtMs }`. The correlation ID is generated on the server and appears unchanged in the SSE snapshot's `mutations` array. The database clock is sampled inside the transaction before commit, so latency includes the remaining commit time. One snapshot can acknowledge multiple writes.
4. Use distinct signed-in Playwright storage state files for coach and athlete. Keep these files and the fixture out of Git. Measure `databaseMinusRunnerMs` and its uncertainty with synchronized clocks before each run. Include fixture origin, receiver path, offset, uncertainty, and exactly 100 mutations.

Example fixture shape. Expand `mutations` to 100 unique IDs and real staging writes.

```json
{
  "origin": "https://staging.example.com",
  "receiverPath": "/team/fixture-team/sessions/fixture-session/display?perf=1",
  "databaseMinusRunnerMs": 0,
  "clockUncertaintyMs": 3,
  "mutations": [
    {
      "id": "forge-test-001",
      "method": "POST",
      "path": "/api/teams/fixture-team/sessions/fixture-session/sets",
      "body": { "fixtureSet": 1 }
    }
  ]
}
```

```bash
npx playwright install chromium
FORGE_PERF_ORIGIN=https://staging.example.com \
FORGE_PERF_FIXTURE=/tmp/forge-fixture.json \
FORGE_PERF_COACH_STATE=/tmp/forge-coach.json \
FORGE_PERF_ATHLETE_STATE=/tmp/forge-athlete.json \
node scripts/forge-sse-perf.mjs
```

An optional `FORGE_PERF_CHROMIUM` points to an installed Chromium executable. The command prints sample count and p50/p95. It exits nonzero for missing renders, mismatched IDs, bad clock evidence, or p95 plus clock uncertainty at or above 200 ms. Archive the result with the exact staging revision, runner location, and network conditions. The UI markers are built in. A seeded staging fixture and synchronized clock calibration are required.
