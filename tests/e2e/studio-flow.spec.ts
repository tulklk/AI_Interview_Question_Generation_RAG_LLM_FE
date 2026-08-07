import { test, expect, toast, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/studio/hooks/use-studio.ts (generateQuestions,
// togglePublish, saveDraftAction) and src/features/studio/components/
// studio-action-bar.tsx + chat-panel.tsx's QuestionCard. Maps to Excel sheets
// RAG005/RAG006/RAG007/RAG012/RAG013 (Studio variants). Route: /hr/generate-v2.

const PROJECT_ID = "proj-1";

function approvedPlan() {
  return {
    id: "plan-1",
    projectId: PROJECT_ID,
    revision: 1,
    title: "Senior Backend Developer Interview Plan",
    status: "Approved",
    totalQuestions: 15,
    interviewLengthMinutes: 60,
    difficulty: "Medium",
    difficultyMix: { easy: 5, medium: 7, hard: 3 },
    focusAreas: [{ name: "Backend", weight: 1, orderIndex: 0 }],
    sourcesUsed: [],
    estimatedSections: [],
    sections: [],
    concurrencyVersion: "v1",
  };
}

function readySettings(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID,
    appliedPlanId: "plan-1",
    interviewLengthMinutes: 60,
    numberOfQuestions: 15,
    difficulty: "Medium",
    questionTone: "Professional",
    includeSampleAnswers: true,
    includeScoringRubric: true,
    outputFormat: "StructuredInterviewKit",
    outputLanguage: "Vietnamese",
    questionTypes: ["technical", "system_design", "problem_solving", "behavioral"],
    readiness: {
      hasJobDescription: true,
      hasSelectedDocument: false,
      hasAwaitingApprovalPlan: false,
      hasApprovedPlan: true,
      canGenerateQuestions: true,
    },
    ...overrides,
  };
}

function question(id: string, orderIndex: number, content = `Explain question ${orderIndex + 1}.`) {
  return {
    id,
    content,
    difficulty: "Medium",
    type: "Technical",
    orderIndex,
    expectedAnswer: null,
    scoringRubric: null,
  };
}

/** Base Studio bootstrap: a single project with an Approved plan + ready settings.
 *  Individual endpoints can be overridden by registering a route AFTER calling this. */
async function mockStudioBootstrap(
  page: Page,
  opts: {
    plan?: unknown;
    settings?: unknown;
    generationRuns?: unknown[];
    questions?: unknown[];
  } = {}
) {
  const plan = opts.plan === undefined ? approvedPlan() : opts.plan;
  const settings = opts.settings === undefined ? readySettings() : opts.settings;
  const generationRuns = opts.generationRuns ?? [];
  const questions = opts.questions ?? [];

  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]),
    });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) => {
    if (plan === null) return route.fulfill({ status: 204, body: "" });
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(plan) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(settings) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(generationRuns) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 100, total: questions.length, items: questions }),
    })
  );
}

test("RAG005-ST: happy-path generate flow shows the RAG-started and questions-generated toasts", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  const generatedQuestions = Array.from({ length: 5 }, (_, i) => question(`q-${i}`, i));
  const run = {
    id: "run-1",
    planId: "plan-1",
    status: "Completed",
    requestedQuestionCount: 5,
    generatedQuestionCount: 5,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  };
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(run) })
  );
  // bootstrap() always calls listQuestions once up-front when a plan exists (regardless
  // of generation status) — the first hit must stay empty so the CTA still reads
  // "Generate Questions"; only the post-generation re-fetch should return the 5 items.
  let questionsCallCount = 0;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) => {
    questionsCallCount++;
    const items = questionsCallCount > 1 ? generatedQuestions : [];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 100, total: items.length, items }),
    });
  });

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeVisible({ timeout: 10000 });
  await expect(generateBtn).toBeEnabled();
  await generateBtn.click();

  await expect(toast(page, "Sent to RAG — generating questions…")).toBeVisible({ timeout: 10000 });
  await expect(toast(page, "5 questions generated.")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Explain question 1.")).toBeVisible();
});

test("RAG006-ST: a QUESTIONS_ALREADY_EXIST conflict auto-retries with replaceExisting", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  const run = {
    id: "run-2",
    planId: "plan-1",
    status: "Completed",
    requestedQuestionCount: 3,
    generatedQuestionCount: 3,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  };
  const calls: boolean[] = [];
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, async (route) => {
    const body = route.request().postDataJSON() as { replaceExisting: boolean };
    calls.push(body.replaceExisting);
    if (!body.replaceExisting) {
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "QUESTIONS_ALREADY_EXIST" }),
      });
    }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(run) });
  });
  const generatedQuestions = Array.from({ length: 3 }, (_, i) => question(`q-${i}`, i));
  let questionsCallCount = 0;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) => {
    questionsCallCount++;
    const items = questionsCallCount > 1 ? generatedQuestions : [];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 100, total: items.length, items }),
    });
  });

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  await expect(toast(page, "3 questions generated.")).toBeVisible({ timeout: 10000 });
  expect(calls).toEqual([false, true]); // first attempt without replace, then a retry with replace
});

test("RAG007-ST: a Failed generation run surfaces the RAG error code/message as a toast", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  const run = {
    id: "run-3",
    planId: "plan-1",
    status: "Failed",
    requestedQuestionCount: 15,
    generatedQuestionCount: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorCode: "RAG_TIMEOUT",
    errorMessage: "RAG service did not respond in time.",
  };
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(run) })
  );

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  await expect(toast(page, "[RAG_TIMEOUT] RAG service did not respond in time.")).toBeVisible({ timeout: 10000 });
  // isGeneratingQuestions resets to false and the CTA is clickable again (not stuck "Generating…").
  await expect(generateBtn).toBeEnabled();
});

test("RGA-SUB-1: a QUOTA_EXCEEDED errorCode on the generate call maps to the canned subscription message", async ({ page }) => {
  // Grounded in src/core/interceptors/error.interceptor.ts's SUBSCRIPTION_ERROR_MESSAGES
  // table — extractErrorMessage() checks response.data.errorCode against this map
  // BEFORE falling back to the raw detail/title/message fields.
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ errorCode: "QUOTA_EXCEEDED", detail: "raw backend detail that should be ignored" }),
    })
  );

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  await expect(
    toast(page, "You've used up your quota for this period. Upgrade to Premium or buy an extra Ask-AI pack.")
  ).toBeVisible({ timeout: 10000 });
});

test("RGA-SUB-2: an unrecognized errorCode falls back to the raw backend detail message", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ errorCode: "SOME_UNMAPPED_CODE", detail: "Plan revision is out of date, refresh and try again." }),
    })
  );

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  await expect(toast(page, "Plan revision is out of date, refresh and try again.")).toBeVisible({ timeout: 10000 });
});

test("RAG012-ST-1: editing a generated question's content persists via PUT and re-renders", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  const initialQuestions = [question("q-1", 0, "Original question text.")];
  const completedRun = {
    id: "run-4",
    planId: "plan-1",
    status: "Completed",
    requestedQuestionCount: 1,
    generatedQuestionCount: 1,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  };
  await mockStudioBootstrap(page, { generationRuns: [completedRun], questions: initialQuestions });

  let putBody: unknown = null;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/q-1`, (route) => {
    if (route.request().method() === "PUT") {
      putBody = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    route.fallback();
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByText("Original question text.")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Edit" }).click();
  const textarea = page.getByPlaceholder("Question content");
  await textarea.fill("Updated question text.");
  await page.locator("div.flex.justify-end.gap-2").getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Updated question text.")).toBeVisible({ timeout: 10000 });
  expect((putBody as { content?: string })?.content).toBe("Updated question text.");
});

test("RAG012-ST-2: deleting a question asks for confirmation, calls DELETE, and removes it from the list", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  const initialQuestions = [question("q-1", 0, "Question to delete.")];
  const completedRun = {
    id: "run-5",
    planId: "plan-1",
    status: "Completed",
    requestedQuestionCount: 1,
    generatedQuestionCount: 1,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  };
  await mockStudioBootstrap(page, { generationRuns: [completedRun], questions: initialQuestions });

  let deleteCalled = false;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/q-1`, (route) => {
    if (route.request().method() === "DELETE") {
      deleteCalled = true;
      return route.fulfill({ status: 204, body: "" });
    }
    route.fallback();
  });

  page.once("dialog", (dialog) => dialog.accept());
  await page.goto("/hr/generate-v2");
  await expect(page.getByText("Question to delete.")).toBeVisible({ timeout: 10000 });

  await page.getByTitle("Delete").click();
  await expect(page.getByText("Question to delete.")).not.toBeVisible({ timeout: 10000 });
  expect(deleteCalled).toBe(true);
});

test("RAG012-ST-3: regenerating a question calls the regenerate endpoint then re-fetches the list", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  const initialQuestions = [question("q-1", 0, "Original question.")];
  const completedRun = {
    id: "run-8", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
    startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
  };
  await mockStudioBootstrap(page, { generationRuns: [completedRun], questions: initialQuestions });

  let regenerateCalled = false;
  let regenerateBody: Record<string, unknown> | null = null;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/q-1/regenerate`, (route) => {
    regenerateCalled = true;
    regenerateBody = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  const regeneratedQuestions = [question("q-1", 0, "Freshly regenerated question.")];
  let questionsCallCount = 0;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) => {
    questionsCallCount++;
    const items = questionsCallCount > 1 ? regeneratedQuestions : initialQuestions;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: items.length, items }) });
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByText("Original question.")).toBeVisible({ timeout: 10000 });

  await page.getByTitle("Regenerate").click();
  await expect(page.getByText("Freshly regenerated question.")).toBeVisible({ timeout: 10000 });
  expect(regenerateCalled).toBe(true);
  expect((regenerateBody as unknown as { includeSampleAnswers?: boolean })?.includeSampleAnswers).toBe(true);
});

test("RAG013-ST-3: Share creates a link, copies it to clipboard, and shows a confirmation toast", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  let shareCalled = false;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/share-links`, (route) => {
    shareCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "share-1", token: "tok-abc123", permission: "View" }) });
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByRole("button", { name: "Generate Questions" })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Share" }).click();

  await expect(toast(page, "Share link created and copied to clipboard.")).toBeVisible({ timeout: 10000 });
  expect(shareCalled).toBe(true);
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain("tok-abc123");
});

test("RAG013-ST-1: Save draft persists and shows a confirmation toast", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  let saveDraftCalled = false;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/save-draft`, (route) => {
    saveDraftCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questionSetId: "qs-1" }) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: PROJECT_ID,
        name: "Interview Plan Studio",
        status: "Approved",
        isPublished: false,
        questionSetId: "qs-1",
        ownerId: "test-hr-user-id",
        latestPlanRevision: 1,
      }),
    });
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByRole("button", { name: "Generate Questions" })).toBeVisible({ timeout: 10000 });
  await page.getByRole("region", { name: "Action bar" }).getByRole("button", { name: "Save" }).click({ force: true });

  await expect(toast(page, "Draft saved.")).toBeVisible({ timeout: 10000 });
  expect(saveDraftCalled).toBe(true);
});

test("RAG013-ST-2: Publish then unpublish toggles state and fires the correct endpoints", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  const initialQuestions = [question("q-1", 0, "A generated question.")];
  const completedRun = {
    id: "run-6",
    planId: "plan-1",
    status: "Completed",
    requestedQuestionCount: 1,
    generatedQuestionCount: 1,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorCode: null,
    errorMessage: null,
  };
  await mockStudioBootstrap(page, { generationRuns: [completedRun], questions: initialQuestions });

  let isPublished = false;
  await page.route(`**/api/studio/projects/${PROJECT_ID}`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: PROJECT_ID,
        name: "Interview Plan Studio",
        status: "Approved",
        isPublished,
        questionSetId: "qs-1",
        ownerId: "test-hr-user-id",
        latestPlanRevision: 1,
      }),
    });
  });
  await page.route("**/api/hr/question-sets/qs-1/publish", (route) => {
    isPublished = true;
    route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/hr/question-sets/qs-1/unpublish", (route) => {
    isPublished = false;
    route.fulfill({ status: 200, body: "" });
  });

  await page.goto("/hr/generate-v2");
  const publishBtn = page.getByRole("button", { name: "Publish" });
  await expect(publishBtn).toBeVisible({ timeout: 10000 });
  await publishBtn.click();

  await expect(toast(page, "Question set published.")).toBeVisible({ timeout: 10000 });
  const publishedBtn = page.getByRole("button", { name: "Published" });
  await expect(publishedBtn).toBeVisible();

  await publishedBtn.click();
  await expect(toast(page, "Question set unpublished.")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
});

test("RAG029-1: \"New Set\" creates a fresh project and resets JD/plan/settings/questions to blank", async ({ page }) => {
  // Grounded in use-studio.ts's createNewSession(): POSTs a new project, then
  // wipes every piece of local state (jdContent, plan, settings, questions,
  // messages, generationRun) rather than re-running bootstrap().
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  const initialQuestions = [question("q-1", 0, "A generated question.")];
  const completedRun = {
    id: "run-7", planId: "plan-1", status: "Completed",
    requestedQuestionCount: 1, generatedQuestionCount: 1,
    startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    errorCode: null, errorMessage: null,
  };
  await mockStudioBootstrap(page, { generationRuns: [completedRun], questions: initialQuestions });

  let createProjectBody: Record<string, unknown> | null = null;
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() === "POST") {
      createProjectBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "proj-2", name: (createProjectBody as { name?: string })?.name ?? "New" }),
      });
    }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "Interview Plan Studio" }]) });
  });

  await page.goto("/hr/generate-v2");
  await expect(page.getByText("A generated question.")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "New Set" }).click();
  await expect(toast(page, "New session created. Enter a JD, select documents, then create a plan.")).toBeVisible({ timeout: 10000 });

  expect(createProjectBody).not.toBeNull();
  await expect(page.getByText("A generated question.")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible();
  await expect(page.getByPlaceholder("Paste your job description here…")).toHaveValue("");
});

test("RAG030-1: toggling \"Include sample answers\" off persists via PUT settings", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  let putSettingsBody: Record<string, unknown> | null = null;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) => {
    if (route.request().method() === "PUT") {
      putSettingsBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(readySettings({ includeSampleAnswers: false })),
      });
    }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(readySettings()) });
  });

  await page.goto("/hr/generate-v2");
  const sampleAnswersToggle = page.getByRole("switch").first();
  await expect(sampleAnswersToggle).toBeVisible({ timeout: 10000 });
  await expect(sampleAnswersToggle).toHaveAttribute("aria-checked", "true");

  await sampleAnswersToggle.click();
  await expect(sampleAnswersToggle).toHaveAttribute("aria-checked", "false", { timeout: 5000 });
  expect((putSettingsBody as unknown as { includeSampleAnswers?: boolean })?.includeSampleAnswers).toBe(false);
});

test("RAG008-1: a generation run stuck \"Generating\" for the full 5-minute deadline shows the timeout recovery message", async ({ page }) => {
  // Grounded in use-studio.ts's generateQuestions(): polls getGenerationRun()
  // every 2.5s against a real `Date.now() + 5*60_000` deadline, and if the run
  // never reaches Completed/Failed/Cancelled within that window, throws
  // `Job vẫn ${status} sau 5 phút (run ${id}…). RAG có thể chưa callback —
  // bấm Làm mới trạng thái.` Uses Playwright's clock API to fast-forward the
  // full 5 minutes of virtual time instead of actually waiting — the mocked
  // network round-trips inside the loop still resolve for real, just
  // compressed into a few seconds of wall-clock time.
  await page.clock.install();
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await mockStudioBootstrap(page);

  const stuckRun = {
    id: "run-stuck-1234", planId: "plan-1", status: "Generating",
    requestedQuestionCount: 15, generatedQuestionCount: 0,
    startedAt: new Date().toISOString(), completedAt: null, errorCode: null, errorMessage: null,
  };
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stuckRun) })
  );
  let pollCount = 0;
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs/run-stuck-1234`, (route) => {
    pollCount++;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stuckRun) }); // never completes
  });

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();
  await expect(toast(page, "Sent to RAG — generating questions…")).toBeVisible({ timeout: 10000 });

  // Fast-forward past the 5-minute deadline in one jump. Date.now() lands
  // fully past the deadline immediately, so the while loop's very next check
  // (after a single real poll + its mocked network round-trip) already sees
  // "past deadline" and exits — a real, correct short-circuit of the same
  // outcome 120 real 2.5s polls would eventually reach, just without
  // spending 5 real minutes getting there.
  await page.clock.fastForward("05:05");
  await expect(page.getByText(/Job vẫn Generating sau 5 phút/)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/bấm Làm mới trạng thái/)).toBeVisible();
  expect(pollCount).toBeGreaterThanOrEqual(1);
});
