# Forge SSE staging latency test

This Playwright template measures **committed server mutation to foreground browser DOM update** for 100 concurrent requests. It exercises the real browser's SSE client and UI rendering. Use the same event correlation and synchronized-clock method in a native iOS test before claiming native parity. Measure ActivityKit separately.

## Staging adapter

1. Seed a disposable team and session with independent mutations. Use distinct sets, racks, or sessions where appropriate. Preserve all 100 intended commits so the test measures delivery under concurrency, rather than contention from repeated writes to a single set.
2. Use a staging-only receiver route with the real client stream and UI state. Set `data-forge-perf="ready"` and `data-forge-transport="sse"` once the stream has applied its first authorized snapshot. On the rendered row for each tracked update, expose `data-forge-rendered-id="<correlation-id>"`. Keep those elements mounted for the duration of the burst. Set the marker in the same render that applies the real state.
3. On authenticated fixture mutations, accept `X-Forge-Perf-Id` and return `{ "correlationId": "...", "committedAtMs": 0 }`, where `committedAtMs` is the server Unix epoch in milliseconds recorded immediately after commit, before broker publication. Carry the same ID through the actual event and UI. Keep this instrumentation restricted to staging and disposable records.
4. Use distinct signed-in Playwright storage state files for coach and athlete. Keep these files and the fixture out of Git. Measure `serverMinusRunnerMs` and its uncertainty with synchronized clocks before each run. Include fixture origin, receiver path, offset, uncertainty, and exactly 100 mutations.

Example fixture shape. Expand `mutations` to 100 unique IDs and real staging writes.

```json
{
  "origin": "https://staging.example.com",
  "receiverPath": "/test-fixtures/forge-receiver",
  "serverMinusRunnerMs": 0,
  "clockUncertaintyMs": 3,
  "mutations": [
    {
      "id": "forge-test-001",
      "method": "POST",
      "path": "/test-fixtures/forge-sets",
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

An optional `FORGE_PERF_CHROMIUM` points to an installed Chromium executable. The command prints sample count and p50/p95. It exits nonzero for missing renders, mismatched IDs, bad clock evidence, or p95 plus clock uncertainty at or above 200 ms. Archive the result with the exact staging revision, runner location, and network conditions. The SSE controller and staging adapter must exist before this test can run against MENTA.
