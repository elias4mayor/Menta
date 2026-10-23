import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// Focused suite with a portable server command. Uses a real test Postgres DB
// and real sessions; provide DATABASE_URL / SESSION_SECRET in a local .env.
export default defineConfig({
  ...config,
  testMatch: "workout-session.spec.ts",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
