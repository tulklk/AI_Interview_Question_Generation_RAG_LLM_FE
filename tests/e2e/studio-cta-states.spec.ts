import { test, expect, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/studio/components/studio-action-bar.tsx's cta
// selection logic (hasQuestions > isGeneratingQuestions > planApproved >
// isStreaming > plan > else) and chat-panel.tsx's tabs array (`{ id:
// "questions", hidden: !hasQuestions }` — there is no dedicated empty-state
// message for "no questions yet", the tab simply doesn't render at all).
// Maps to Excel sheets RAG037 (StudioApprovePlanButtonStates) and RAG039
// (StudioQuestionListEmptyStateBeforeGenerate). Route: /hr/generate-v2.

const PROJECT_ID = "proj-1";

function readySettings(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID, appliedPlanId: null, interviewLengthMinutes: 60, numberOfQuestions: 10,
    difficulty: "Medium", questionTone: "Professional", includeSampleAnswers: true, includeScoringRubric: true,
    outputFormat: "StructuredInterviewKit", outputLanguage: "Vietnamese",
    questionTypes: ["technical", "system_design", "problem_solving", "behavioral"],
    readiness: { hasJobDescription: false, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: false, canGenerateQuestions: false },
    ...overrides,
  };
}

async function mockStudioBootstrap(
  page: Page,
  opts: { plan?: unknown; settings?: unknown; questions?: unknown[]; hasJd?: boolean } = {}
) {
  const plan = opts.plan === undefined ? null : opts.plan;
  const settings = opts.settings ?? readySettings();
  const questions = opts.questions ?? [];

  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) =>
    opts.hasJd
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: "Some JD content here.", sourceType: "PastedText", wordCount: 4, characterCount: 24 }) })
      : route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => {
    if (plan === null) return route.fulfill({ status: 204, body: "" });
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(plan) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(settings) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  const runs = questions.length > 0
    ? [{ id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: questions.length, generatedQuestionCount: questions.length, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null }]
    : [];
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(runs) }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: questions.length, items: questions }) })
  );
}

function draftPlan(status: string) {
  return {
    id: "plan-1", projectId: PROJECT_ID, revision: 1, title: "Senior Backend Developer Interview Plan",
    status, totalQuestions: 5, interviewLengthMinutes: 60, difficulty: "Medium",
    difficultyMix: { easy: 2, medium: 2, hard: 1 }, focusAreas: [{ name: "Backend", weight: 1, orderIndex: 0 }], sourcesUsed: [],
    estimatedSections: [], sections: [], concurrencyVersion: "v1",
  };
}

test("RAG039-1 / RAG037-1: before any plan exists, status reads \"Enter JD to start\" and Create Plan is disabled — no Questions tab", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, {});
  await page.goto("/hr/generate-v2");

  await expect(page.getByRole("region", { name: "Action bar" }).getByText("Enter JD to start")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Questions" })).toHaveCount(0);
});

test("RAG037-2: an unapproved plan shows \"Approve Plan\" as the CTA", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, { plan: draftPlan("Refining"), hasJd: true, settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: false, canGenerateQuestions: false } }) });
  await page.goto("/hr/generate-v2");

  await expect(page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Approve Plan" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Generate Questions" })).toHaveCount(0);
});

test("RAG037-3 / RAG039-2: an approved plan with no questions yet shows \"Generate Questions\" — still no Questions tab (no dedicated empty-state copy)", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, {
    plan: draftPlan("Approved"), hasJd: true,
    settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
  });
  await page.goto("/hr/generate-v2");

  const generateBtn = page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeVisible({ timeout: 10000 });
  await expect(generateBtn).toBeEnabled();
  // No "Questions" tab and no questions-empty-state message anywhere — the
  // only signal that generation hasn't happened yet is the CTA label itself.
  await expect(page.getByRole("button", { name: "Questions", exact: true })).toHaveCount(0);
});

test("RAG037-4: once questions exist, the CTA becomes a disabled \"Completed\" state", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, {
    plan: draftPlan("Approved"), hasJd: true,
    settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
    questions: [{ id: "genq-1", content: "Explain REST vs GraphQL.", difficulty: "Medium", type: "Technical", orderIndex: 0, expectedAnswer: null, scoringRubric: null }],
  });
  await page.goto("/hr/generate-v2");

  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });
  const completedBtn = page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Completed" });
  await expect(completedBtn).toBeVisible();
  await expect(completedBtn).toBeDisabled();
});

test("RAG030-1: a network failure on Apply to plan surfaces an error toast and the button recovers (not stuck spinning)", async ({ page }) => {
  // studioApi.applyPlanSettings() is called with a 30s axios timeout. A real
  // timeout/network failure has no response body at all, so
  // extractErrorMessage() falls through to axios's own generic message
  // (verified structurally the same way as RGA011-1's bare-5xx finding) —
  // simulated here via route.abort() instead of waiting out a real 30s clock.
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  const awaitingPlan = { ...draftPlan("AwaitingApproval") };
  await mockStudioBootstrap(page, {
    plan: awaitingPlan, hasJd: true,
    settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: true, hasApprovedPlan: false, canGenerateQuestions: false } }),
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/plan-1/apply-settings`, (route) => route.abort("timedout"));

  await page.goto("/hr/generate-v2");
  const applyBtn = page.getByRole("button", { name: "Apply to plan" });
  await expect(applyBtn).toBeVisible({ timeout: 10000 });
  await applyBtn.click();

  // axios's own hardcoded message for a genuine timeout, verbatim, no
  // friendlier text substituted anywhere in the chain.
  await expect(page.getByText("timeout of 30000ms exceeded")).toBeVisible({ timeout: 10000 });
  // Button isn't stuck in the "Applying…" loading state forever.
  await expect(page.getByRole("button", { name: "Apply to plan" })).toBeEnabled({ timeout: 5000 });
});
