import { defineConfig, devices } from "@playwright/test";

// Real server output, captured to a fixed path so e2e/fixtures.ts can read
// the actual 6-digit email-verification code that src/lib/email.ts's
// honest RESEND_API_KEY-not-configured fallback prints to the console —
// the same thing a developer running `npm run dev` locally would read by
// eye. Never a faked/bypassed code: this is the real one the app generated.
export const SERVER_LOG_PATH = "/tmp/menta-e2e-server.log";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // 90s, not 45s: Turbopack dev-mode compiles each route on its first hit
  // per server process — confirmed from real server logs, a cold
  // `POST /api/auth/signup` took 26s and a cold `GET /` took 35s the very
  // first time either was requested against a freshly-started server.
  // Whichever test happens to run first pays that cost once; a production
  // build has no such per-route JIT compile at all.
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
  webServer: {
    command: `bash -c "npm run dev > ${SERVER_LOG_PATH} 2>&1"`,
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
    env: { MENTA_E2E_DISABLE_RATE_LIMIT: "1" },
  },
});
