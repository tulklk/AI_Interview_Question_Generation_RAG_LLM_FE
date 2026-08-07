import { test, expect, mockHrSession, freeSubscriptionReady, freeSubscriptionInCooldown, type Page } from "./fixtures";

// Grounded in src/shared/providers/theme-context.tsx (dark class + localStorage
// "hiregena-theme") and the Studio/GenerateForm/quota-modal layouts. Maps to
// Excel sheets UI003/UI004 (Studio), UI005/UI006 (GenerateForm), UI007 (quota
// modal responsive). Extends ui-visual-layout.spec.ts's pattern (already
// covers ManualQuestionPage + Login) to the two other main HR entry points.

const PROJECT_ID = "proj-1";

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

async function mockStudioBootstrap(page: Page) {
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => route.fulfill({ status: 204, body: "" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

test.describe("UI003: Studio page responsive layout", () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`renders without horizontal overflow at ${name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await mockHrSession(page, { subscription: freeSubscriptionReady() });
      await mockStudioBootstrap(page);
      await page.goto("/hr/generate-v2");
      await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible({ timeout: 10000 });

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
});

test("UI004-1: Studio page dark mode toggle applies and persists across reload", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);
  await page.goto("/hr/generate-v2");
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible({ timeout: 10000 });

  const initiallyDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(initiallyDark).toBe(false);

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForTimeout(400);
  const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDarkNow).toBe(true);

  await page.reload();
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible({ timeout: 10000 });
  const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDarkAfterReload).toBe(true);
});

test.describe("UI005: GenerateForm responsive layout", () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`renders without horizontal overflow at ${name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await mockHrSession(page, { subscription: freeSubscriptionReady() });
      await page.goto("/hr/generate");
      await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible({ timeout: 10000 });

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
});

test("UI006-1: GenerateForm dark mode toggle applies the dark class", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.goto("/hr/generate");
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForTimeout(400);
  const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  expect(isDarkNow).toBe(true);
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
});

test.describe("UI007: quota-exceeded modal/banner responsive display", () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`Studio's blocking alertdialog stays usable at ${name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await mockHrSession(page, { subscription: freeSubscriptionInCooldown() });
      await mockStudioBootstrap(page);
      await page.goto("/hr/generate-v2");

      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(dialog.getByRole("button", { name: "Create manually" })).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
});
