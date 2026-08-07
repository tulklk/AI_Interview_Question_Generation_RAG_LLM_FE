import { test, expect, toast, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/hr/components/billing/hr-upgrade-modal.tsx (Escape/
// backdrop close, body scroll lock), src/shared/providers/toast-context.tsx
// (unbounded toast stacking, AUTO_DISMISS_MS=4500, manual dismiss), and
// src/features/interview/components/generate/plan-edit-card.tsx (Approve
// button's isApproving loading state). Maps to Excel sheets UI003 (modals),
// UI004 (toasts), UI006 (button states).

async function mockSession(page: Page) {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
}

test("UI003-1: the upgrade modal locks body scroll while open and restores it on close", async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  const overflowBefore = await page.evaluate(() => document.body.style.overflow);
  expect(overflowBefore).not.toBe("hidden");

  await page.getByRole("button", { name: "Upgrade Plan →" }).click();
  await expect(page.getByText("HR Subscription Plans")).toBeVisible({ timeout: 5000 });
  const overflowOpen = await page.evaluate(() => document.body.style.overflow);
  expect(overflowOpen).toBe("hidden");

  await page.locator("div.fixed.inset-0.z-\\[9999\\]").getByRole("button").first().click();
  await expect(page.getByText("HR Subscription Plans")).not.toBeVisible();
  const overflowClosed = await page.evaluate(() => document.body.style.overflow);
  expect(overflowClosed).toBe("");
});

test("UI003-2: pressing Escape closes the upgrade modal", async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Upgrade Plan →" }).click();
  await expect(page.getByText("HR Subscription Plans")).toBeVisible({ timeout: 5000 });

  await page.keyboard.press("Escape");
  await expect(page.getByText("HR Subscription Plans")).not.toBeVisible();
});

test("UI003-3: clicking the backdrop closes the upgrade modal", async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Upgrade Plan →" }).click();
  await expect(page.getByText("HR Subscription Plans")).toBeVisible({ timeout: 5000 });

  // Click the backdrop overlay itself, not the modal card — top-left corner is
  // outside the centered card's bounds at default viewport size.
  await page.mouse.click(5, 5);
  await expect(page.getByText("HR Subscription Plans")).not.toBeVisible();
});

test("UI004-1: multiple toasts stack (no cap, no dedup) instead of replacing each other", async ({ page }) => {
  await mockSession(page);
  const PROJECT_ID = "proj-1";
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "x" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => route.fulfill({ status: 204, body: "" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: PROJECT_ID, name: "x", status: "Draft", isPublished: false, questionSetId: null, ownerId: "u", latestPlanRevision: 0 }),
    });
  });
  let saveDraftCalls = 0;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/save-draft`, (route) => {
    saveDraftCalls++;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questionSetId: "qs-1" }) });
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByRole("region", { name: "Action bar" })).toBeVisible({ timeout: 10000 });
  const saveBtn = page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Save" });

  // Two rapid saves both resolve near-instantly (mocked) and each fires its own
  // "Draft saved." toast — the provider never caps or dedupes the list, so both
  // must be visible together, not replace one another.
  await saveBtn.click({ force: true });
  await saveBtn.click({ force: true });

  const toastContainer = page.locator("div.fixed.bottom-6.right-6");
  await expect(toastContainer.getByText("Draft saved.")).toHaveCount(2, { timeout: 10000 });
  expect(saveDraftCalls).toBe(2);
});

test("UI004-2: dismissing a toast via its close (X) button removes it immediately, before the auto-dismiss timer", async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  // Any toast-producing action works — use the theme toggle's neighbor: trigger
  // via the manual-question page's own save flow is heavier, so use a cheap,
  // already-covered trigger: attempt Save with a blank question row (MQ005 in
  // manual-question.spec.ts already proves this produces a toast).
  await page.getByRole("button", { name: "Save question set" }).click({ force: true });
  const toastContainer = page.locator("div.fixed.bottom-6.right-6");
  await expect(toastContainer.locator("> div").first()).toBeVisible({ timeout: 5000 });

  await toastContainer.locator("> div").first().getByRole("button").click();
  await expect(toastContainer.locator("> div")).toHaveCount(0, { timeout: 2000 });
});

test("UI006-1: the Approve Plan button shows a disabled loading state while the request is in flight", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-123",
        phase: "PLAN_PROPOSED",
        status: "PLAN_PROPOSED",
        jobTitle: "Senior Backend Developer",
        ui: { suggestedAction: "REVIEW_PLAN", isPolling: false },
        plan: {
          roleTitle: "Senior Backend Developer",
          experienceLevel: "senior",
          difficulty: "medium",
          totalQuestions: 10,
          questionTypes: ["Technical", "Behavioral"],
          skills: ["Node.js"],
        },
      }),
    })
  );
  // Deliberately slow approve-plan response so the loading state is observable.
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/hr/generate");
  const textarea = page.locator("textarea").first();
  await textarea.fill(
    "We are looking for a Senior Backend Developer to join our growing engineering team. " +
    "You will design, build, and maintain scalable RESTful APIs and microservices using Node.js and TypeScript. " +
    "Responsibilities include collaborating with product managers and frontend engineers to ship new features, " +
    "writing clean and well-tested code, participating in code reviews, and mentoring junior engineers. " +
    "Requirements: 5+ years of backend development experience, strong knowledge of SQL and NoSQL databases, " +
    "experience with Docker and Kubernetes, familiarity with CI/CD pipelines, and excellent communication skills. " +
    "Nice to have: experience with AWS, GraphQL, and event-driven architectures. We offer competitive salary, " +
    "remote-friendly work, and a collaborative engineering culture focused on continuous learning and growth."
  );
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Approve Plan" }).click({ force: true });
  const loadingBtn = page.getByRole("button", { name: "Approving..." });
  await expect(loadingBtn).toBeVisible({ timeout: 2000 });
  await expect(loadingBtn).toBeDisabled();
});
