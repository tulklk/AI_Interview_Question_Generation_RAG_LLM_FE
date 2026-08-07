import { test, expect, type Page } from "@playwright/test";

// Grounded in src/shared/providers/theme-context.tsx (applies a "dark" class
// to <html>, persists to localStorage key "hiregena-theme") and
// src/shared/components/common/theme-toggle.tsx. Maps to Excel sheets
// UI001/UI002/UI010/UI017 (UIVisualLayoutModule).

async function mockSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }),
    })
  );
}

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

test.describe("UI001: ManualQuestionPage responsive layout", () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`renders without horizontal overflow at ${name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await mockSession(page);
      await page.goto("/hr/generate/manual");
      await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // A few px of tolerance for scrollbars; the body must not scroll horizontally.
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

      // Core actions stay reachable at every breakpoint.
      await expect(page.getByRole("button", { name: "Save question set" })).toBeVisible();
    });
  }
});

test("UI002-1: dark mode toggle applies the \"dark\" class to <html> and persists it", async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible();

  const initiallyDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(initiallyDark).toBe(false); // default/light on a fresh session

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForTimeout(400); // theme-context.tsx briefly disables transitions during the switch

  const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDarkNow).toBe(true);

  const stored = await page.evaluate(() => localStorage.getItem("hiregena-theme"));
  expect(stored).toBe("dark");

  // Persists across reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible();
  const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDarkAfterReload).toBe(true);
});

test("UI002-2: toggling back to light mode removes the \"dark\" class", async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate/manual");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForTimeout(400);
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.waitForTimeout(400);
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDark).toBe(false);
  const stored = await page.evaluate(() => localStorage.getItem("hiregena-theme"));
  expect(stored).toBe("light");
});

test.describe("UI010/UI017: Login page responsive + no horizontal overflow", () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`Login form renders correctly at ${name}`, async ({ page }) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      );
      await page.setViewportSize(size);
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
});
