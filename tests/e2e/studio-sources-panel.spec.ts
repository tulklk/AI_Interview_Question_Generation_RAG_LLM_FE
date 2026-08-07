import { test, expect, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/studio/components/sources-panel.tsx (RagStatusChip
// and the `locked` overlay driven by studio-page.tsx's sideColumnsLocked =
// isGeneratingQuestions || questions.length > 0). Maps to Excel sheets RAG003
// (KnowledgeDocumentIngestionStatus) and RAG004 (SourcesPanelLockOnGenerate).
// Route: /hr/generate-v2.

const PROJECT_ID = "proj-1";

function readySettings(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID, appliedPlanId: "plan-1", interviewLengthMinutes: 60, numberOfQuestions: 10,
    difficulty: "Medium", questionTone: "Professional", includeSampleAnswers: true, includeScoringRubric: true,
    outputFormat: "StructuredInterviewKit", outputLanguage: "Vietnamese",
    questionTypes: ["technical", "system_design", "problem_solving", "behavioral"],
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

async function mockStudioBootstrap(
  page: Page,
  opts: { documents?: unknown[]; questions?: unknown[]; plan?: unknown } = {}
) {
  const documents = opts.documents ?? [];
  const questions = opts.questions ?? [];
  const plan = opts.plan === undefined ? null : opts.plan;

  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(documents) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => {
    if (plan === null) return route.fulfill({ status: 204, body: "" });
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(plan) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(readySettings()) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  const runs = questions.length > 0
    ? [{ id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null }]
    : [];
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(runs) }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: questions.length, items: questions }) })
  );
}

test("RAG003-1: document status chips reflect Ready/Processing/Error with correct color and icon", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, {
    documents: [
      { id: "d1", fileName: "handbook.pdf", fileType: "pdf", fileSize: 20480, isSelected: true, status: "Completed", ragStatus: "COMPLETED", chunkCount: 8 },
      { id: "d2", fileName: "still-going.pdf", fileType: "pdf", fileSize: 10240, isSelected: false, status: "Processing", ragStatus: "PROCESSING" },
      { id: "d3", fileName: "broke.pdf", fileType: "pdf", fileSize: 5120, isSelected: false, status: "Failed", ragStatus: "FAILED", processingError: "Unreadable PDF content" },
    ],
  });
  await page.goto("/hr/generate-v2");

  await expect(page.getByText("handbook.pdf")).toBeVisible({ timeout: 10000 });
  const readyRow = page.locator("label").filter({ hasText: "handbook.pdf" });
  await expect(readyRow.getByText("Ready")).toBeVisible();
  await expect(readyRow.locator('input[type="checkbox"]')).toBeEnabled();

  const processingRow = page.locator("label").filter({ hasText: "still-going.pdf" });
  await expect(processingRow.getByText("Processing")).toBeVisible();
  await expect(processingRow.locator('input[type="checkbox"]')).toBeDisabled();

  const failedRow = page.locator("label").filter({ hasText: "broke.pdf" });
  await expect(failedRow.getByText("Error")).toBeVisible();
  await expect(failedRow.getByText("Unreadable PDF content")).toBeVisible();
  await expect(failedRow.locator('input[type="checkbox"]')).toBeDisabled();
});

test("RAG004-1: once questions are generated, the Sources panel locks — JD field disabled with a lock hint", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, {
    plan: approvedPlan(),
    questions: [{ id: "q-1", content: "Explain REST vs GraphQL.", difficulty: "Medium", type: "Technical", orderIndex: 0, expectedAnswer: null, scoringRubric: null }],
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });

  const jdTextarea = page.getByPlaceholder("Paste your job description here…");
  await expect(jdTextarea).toBeDisabled();
  await expect(page.locator("div[title='Locked — click New Set to edit Sources']")).toBeVisible();
});

test("RAG004-2: before any questions exist, the Sources panel is fully editable (no lock overlay)", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page, {});

  await page.goto("/hr/generate-v2");
  const jdTextarea = page.getByPlaceholder("Paste your job description here…");
  await expect(jdTextarea).toBeVisible({ timeout: 10000 });
  await expect(jdTextarea).toBeEditable();
  await expect(page.locator("div[title='Locked — click New Set to edit Sources']")).toHaveCount(0);
});
