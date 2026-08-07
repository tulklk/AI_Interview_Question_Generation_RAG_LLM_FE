import { test, expect, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in studio-action-bar.tsx's cta.generating state, hr-upgrade-modal.tsx's
// z-[9999] stacking, and standard browser Tab-order focus traversal. Maps to
// Excel sheets UI010 (more button loading states), UI013 (modal z-index),
// UI017 (keyboard Tab navigation).

const PROJECT_ID = "proj-1";

function readySettings(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID, appliedPlanId: "plan-1", interviewLengthMinutes: 60, numberOfQuestions: 1,
    difficulty: "Medium", questionTone: "Professional", includeSampleAnswers: true, includeScoringRubric: true,
    outputFormat: "StructuredInterviewKit", outputLanguage: "Vietnamese",
    questionTypes: ["technical"],
    readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true },
    ...overrides,
  };
}
function approvedPlan() {
  return {
    id: "plan-1", projectId: PROJECT_ID, revision: 1, title: "Senior Backend Developer Interview Plan",
    status: "Approved", totalQuestions: 1, interviewLengthMinutes: 60, difficulty: "Medium",
    difficultyMix: { easy: 0, medium: 1, hard: 0 }, focusAreas: [{ name: "Backend", weight: 1, orderIndex: 0 }], sourcesUsed: [],
    estimatedSections: [], sections: [], concurrencyVersion: "v1",
  };
}
async function mockStudioBootstrap(page: Page) {
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(approvedPlan()) }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(readySettings()) }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: 0, items: [] }) })
  );
}

test("UI010-2: the Studio \"Generate Questions\" CTA shows a disabled \"Generating…\" state while the request is in flight", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
      }),
    });
  });
  // bootstrap() always calls listQuestions() once a plan exists — the first
  // hit must stay empty (see studio-flow.spec.ts's identical fix) so the CTA
  // still reads "Generate Questions" instead of already-"Completed".
  let questionsCallCount = 0;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) => {
    questionsCallCount++;
    const items = questionsCallCount > 1
      ? [{ id: "genq-1", content: "x", difficulty: "Medium", type: "Technical", orderIndex: 0, expectedAnswer: null, scoringRubric: null }]
      : [];
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: items.length, items }) });
  });

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  const generatingBtn = page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Generating…" });
  await expect(generatingBtn).toBeVisible({ timeout: 2000 });
  await expect(generatingBtn).toBeDisabled();

  await expect(page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Completed" })).toBeVisible({ timeout: 10000 });
});

test("UI013-1: the upgrade modal's computed z-index (9999) actually sits above the page's normal content layer", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Upgrade Plan →" }).click();
  const modalRoot = page.locator("div.fixed.inset-0.flex.items-center.justify-center.p-4").filter({ has: page.getByText("HR Subscription Plans") });
  await expect(modalRoot).toBeVisible({ timeout: 5000 });

  const modalZIndex = await modalRoot.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(modalZIndex).toBe(9999);

  // The main app shell / sidebar sits far below it — no manually-set high z-index competes.
  const sidebarZIndex = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    return aside ? Number(getComputedStyle(aside).zIndex) || 0 : 0;
  });
  expect(sidebarZIndex).toBeLessThan(modalZIndex);
});

test("UI017-2: Tab order on the login form moves Email -> Password -> Sign in in a logical sequence", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible({ timeout: 10000 });

  // .focus() rather than .click() — the auth page's entrance/glow animations
  // keep the input's paint state changing, which can trip .click()'s
  // stability check; focusing doesn't need a stable target position.
  await page.getByPlaceholder("you@company.com").focus();
  await expect(page.getByPlaceholder("you@company.com")).toBeFocused();

  // Tab forward (bounded, so a real focus-trap regression fails loudly
  // instead of looping forever) until Password is reached, then continue
  // until Sign in is reached — asserts the relative order, not exact
  // adjacency, since icons/toggles may sit in between.
  async function tabUntilFocused(name: string, locator: ReturnType<typeof page.getByPlaceholder> | ReturnType<typeof page.getByRole>, maxTabs: number) {
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");
      if (await locator.evaluate((el) => el === document.activeElement).catch(() => false)) return true;
    }
    throw new Error(`Never reached ${name} within ${maxTabs} tabs`);
  }

  await tabUntilFocused("Password field", page.getByPlaceholder("••••••••"), 3);
  await tabUntilFocused("Sign in button", page.getByRole("button", { name: "Sign in" }), 5);
});
