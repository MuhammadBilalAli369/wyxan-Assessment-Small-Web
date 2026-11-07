import { defineConfig, devices } from "@playwright/test";

const FRONTEND = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3847";
const API = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:3848/api";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: FRONTEND,
    trace: "on-first-retry",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  metadata: { api: API },
});
