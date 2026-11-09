import { readFile } from "node:fs/promises";
import { chromium, request } from "@playwright/test";

const SAMPLE_COUNT = 100;
const LIMIT_MS = 200;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sameOriginUrl(path, origin) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Fixture paths must be relative to the staging origin");
  }
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Fixture path leaves the staging origin");
  return url.href;
}

function percentile(sorted, fraction) {
  return sorted[Math.ceil(sorted.length * fraction) - 1];
}

async function main() {
  const base = new URL(required("FORGE_PERF_ORIGIN"));
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    throw new Error("Use HTTPS for a remote staging origin");
  }
  const fixture = JSON.parse(await readFile(required("FORGE_PERF_FIXTURE"), "utf8"));
  if (fixture.origin !== base.origin || !Array.isArray(fixture.mutations) || fixture.mutations.length !== SAMPLE_COUNT) {
    throw new Error("Fixture origin must match and contain exactly 100 disposable mutations");
  }
  const { serverMinusRunnerMs, clockUncertaintyMs } = fixture;
  if (!Number.isFinite(serverMinusRunnerMs) || !Number.isFinite(clockUncertaintyMs)
    || clockUncertaintyMs < 0 || clockUncertaintyMs > 10) {
    throw new Error("Provide a measured server clock offset and uncertainty of at most 10 ms");
  }
  const receiverUrl = sameOriginUrl(fixture.receiverPath, base.origin);
  const mutations = fixture.mutations.map(({ id, method, path, body }) => {
    if (typeof id !== "string" || !id || !["POST", "PATCH", "PUT"].includes(method)) {
      throw new Error("Each mutation needs a correlation ID and a supported method");
    }
    return { id, method, url: sameOriginUrl(path, base.origin), body };
  });
  if (new Set(mutations.map(({ id }) => id)).size !== SAMPLE_COUNT) {
    throw new Error("Each mutation must have a unique correlation ID");
  }

  const coachState = required("FORGE_PERF_COACH_STATE");
  const athleteState = required("FORGE_PERF_ATHLETE_STATE");
  const browser = await chromium.launch({ executablePath: process.env.FORGE_PERF_CHROMIUM });
  try {
    const coach = await request.newContext({ storageState: coachState });
    try {
      const context = await browser.newContext({ storageState: athleteState });
      const page = await context.newPage();
      await page.goto(receiverUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
      if (new URL(page.url()).origin !== base.origin) throw new Error("Receiver left the staging origin");
      await page.locator('[data-forge-perf="ready"][data-forge-transport="sse"]').waitFor({ timeout: 10_000 });
      await page.evaluate(() => {
        window.forgeRendered = new Map();
        const record = () => {
          for (const element of document.querySelectorAll("[data-forge-rendered-id]")) {
            const id = element.getAttribute("data-forge-rendered-id");
            if (!window.forgeRendered.has(id)) {
              window.forgeRendered.set(id, performance.timeOrigin + performance.now());
            }
          }
        };
        new MutationObserver(record).observe(document.body, {
          childList: true, subtree: true, attributes: true,
          attributeFilter: ["data-forge-rendered-id"],
        });
        record();
      });
      const ids = mutations.map(({ id }) => id);
      if (await page.evaluate((ids) => ids.some((id) => window.forgeRendered.has(id)), ids)) {
        throw new Error("A fixture correlation ID has already rendered. Use fresh fixtures");
      }

      const committed = await Promise.all(mutations.map(async ({ id, method, url, body }) => {
        const response = await coach.fetch(url, {
          method, data: body, timeout: 15_000, maxRedirects: 0,
          headers: { "X-Forge-Perf-Id": id },
        });
        if (!response.ok()) throw new Error(`Mutation failed with HTTP ${response.status()}`);
        const { correlationId, committedAtMs } = await response.json();
        if (correlationId !== id || !Number.isFinite(committedAtMs)) {
          throw new Error("Mutation did not return a matching ID and server commit timestamp");
        }
        return [id, committedAtMs - serverMinusRunnerMs];
      }));

      await page.waitForFunction((ids) => ids.every((id) => window.forgeRendered.has(id)), ids, { timeout: 10_000 });
      const rendered = new Map(await page.evaluate((ids) => ids.map((id) => [id, window.forgeRendered.get(id)]), ids));
      const latencies = committed.map(([id, time]) => rendered.get(id) - time);
      if (latencies.some((ms) => !Number.isFinite(ms) || ms < -clockUncertaintyMs)) {
        throw new Error("Invalid render timestamp or clock calibration");
      }
      const sorted = latencies.map((ms) => Math.max(0, ms)).sort((a, b) => a - b);
      const p95Ms = percentile(sorted, 0.95);
      const upperP95Ms = p95Ms + clockUncertaintyMs;
      console.log(JSON.stringify({
        samples: sorted.length, concurrency: SAMPLE_COUNT, surface: "foreground-browser-dom",
        p50Ms: percentile(sorted, 0.5), p95Ms, upperP95Ms, clockUncertaintyMs, limitMs: LIMIT_MS,
      }, null, 2));
      if (upperP95Ms >= LIMIT_MS) process.exitCode = 1;
    } finally {
      await coach.dispose();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  // Keep credentials, fixture bodies and request URLs out of console output.
  const message = error instanceof Error ? error.message.split("\n")[0] : "Unknown error";
  console.error(message.replace(/https?:\/\/\S+/g, "[redacted URL]"));
  process.exitCode = 1;
});
