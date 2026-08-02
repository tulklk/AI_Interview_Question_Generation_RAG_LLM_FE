import { defineConfig, devices } from "@playwright/test";

/**
 * E2E regression tests that hit the real backend (https://api.hiregen.io.vn).
 * Requires TEST_HR_EMAIL / TEST_HR_PASSWORD env vars — tests skip themselves
 * when unset instead of failing, so this is safe to run without secrets.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
