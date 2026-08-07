import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/interview/components/generate/generate-form.tsx
// (polling loop, failed-state recovery, localStorage session persistence) and
// src/features/interview/services/interview.service.ts (mapJobToSession's
// ui.suggestedAction / ui.actions / failure.reason contract). Maps to Excel
// sheets RAG017/RAG018/RAG021 (GenerateForm). Route: /hr/generate.

function freeSubscriptionReady() {
  return {
    planCode: "FREE",
    planName: "Free",
    audience: "HR",
    status: "ACTIVE",
    priceMonthly: 0,
    currency: "VND",
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-12-31T00:00:00Z",
    lastSuccessfulGenerateAt: null,
    limits: {
      generateCooldownHours: 24,
      generateUnlimited: false,
      planRegeneratePerDraft: 5,
      canExport: false,
      askAiPerMonth: 0,
      canPublish: false,
      freeVisiblePercent: 50,
      canPersistHrRecommendation: false,
      feedbackOnlyOnVisible: true,
    },
    askAiUsed: 0,
    askAiLimit: 0,
    generateSetUsed: 0,
    entitlements: {
      canExport: false,
      canAskAi: false,
      generateUnlimited: false,
      freeVisiblePercent: 50,
      canPersistHrRecommendation: false,
    },
  };
}

async function mockSession(page: Page, opts: { userId?: string } = {}) {
  const userId = opts.userId ?? "test-hr-user-id";
  await page.addInitScript((uid) => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
    void uid;
  }, userId);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: userId, fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }),
    })
  );
  await page.route("**/api/me/subscription", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(freeSubscriptionReady()) })
  );
}

const VALID_JD =
  "We are looking for a Senior Backend Developer to join our growing engineering team. " +
  "You will design, build, and maintain scalable RESTful APIs and microservices using Node.js and TypeScript. " +
  "Responsibilities include collaborating with product managers and frontend engineers to ship new features, " +
  "writing clean and well-tested code, participating in code reviews, and mentoring junior engineers. " +
  "Requirements: 5+ years of backend development experience, strong knowledge of SQL and NoSQL databases, " +
  "experience with Docker and Kubernetes, familiarity with CI/CD pipelines, and excellent communication skills. " +
  "Nice to have: experience with AWS, GraphQL, and event-driven architectures. We offer competitive salary, " +
  "remote-friendly work, and a collaborative engineering culture focused on continuous learning and growth.";

const PLAN_PROPOSED_JOB = {
  jobId: "job-123",
  id: "job-123",
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
    skills: ["Node.js", "TypeScript"],
  },
};

test("RAG017-2: approving a plan starts question polling and lands on question review once complete", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );

  let approveCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) => {
    approveCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  let jobPollCount = 0;
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    jobPollCount++;
    if (jobPollCount === 1) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...PLAN_PROPOSED_JOB,
        phase: "COMPLETED",
        status: "COMPLETED",
        ui: { suggestedAction: "REVIEW_QUESTIONS", isPolling: false },
      }),
    });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/questions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "q-1", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium", citations: [], orderIndex: 0 },
      ]),
    })
  );

  await page.goto("/hr/generate");
  const textarea = page.locator("textarea").first();
  await textarea.fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Approve Plan" }).click({ force: true });
  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });
  expect(approveCalled).toBe(true);
});

test("RAG019-1: Ask AI per-question chat sends a prompt and renders the AI's reply", async ({ page }) => {
  // Grounded in src/features/question/components/ask-ai-panel.tsx. Its
  // questionIdValid guard requires an id that doesn't start with "q-"/"stub-"/
  // "manual-", so the mocked question below uses a realistic server-issued id.
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  let jobPollCount = 0;
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    jobPollCount++;
    if (jobPollCount === 1) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...PLAN_PROPOSED_JOB, phase: "COMPLETED", status: "COMPLETED", ui: { suggestedAction: "REVIEW_QUESTIONS", isPolling: false } }),
    });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/questions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "genq-1", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium", citations: [], orderIndex: 0 }]),
    })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123/questions/genq-1/ai-chat", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  let askAiCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/questions/genq-1/ask-ai", (route) => {
    askAiCalled = true;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply: "Here's a harder version focused on system design trade-offs.", suggestion: null }),
    });
  });

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Approve Plan" }).click({ force: true });
  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });

  await page.getByTitle("Ask AI").first().click();
  const composer = page.getByPlaceholder(/Make this question harder/);
  await expect(composer).toBeVisible({ timeout: 10000 });
  await composer.fill("Make this harder.");
  await composer.press("Enter");

  await expect(page.getByText("Here's a harder version focused on system design trade-offs.")).toBeVisible({ timeout: 10000 });
  expect(askAiCalled).toBe(true);
});

test("RAG023-1 (finding): a duplicate save-draft (409) shows the same \"Saved!\" success state, but the draft's questionSetId never propagates", async ({ page }) => {
  // saveJobDraft() treats a 409 ("already saved") as a non-error and returns
  // null. handleSaveDraft() only calls onDraftSaved(savedQuestionSetId) when
  // that value is truthy, so on a 409 it's silently skipped — yet
  // setSaveState("saved") runs unconditionally right after, so the button
  // shows the exact same "Saved!" confirmation as a real first-time save.
  // The parent's questionSetId stays undefined, so Publish/Share stay gated
  // behind "Save a draft first to enable publishing." with zero indication
  // to the user that anything is different from a normal save.
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  let jobPollCount = 0;
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    jobPollCount++;
    if (jobPollCount === 1) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...PLAN_PROPOSED_JOB, phase: "COMPLETED", status: "COMPLETED", ui: { suggestedAction: "REVIEW_QUESTIONS", isPolling: false } }),
    });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/questions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "genq-1", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium", citations: [], orderIndex: 0 }]),
    })
  );
  let saveDraftCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/save-draft", (route) => {
    saveDraftCalled = true;
    route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "Already saved as a draft." }) });
  });

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Approve Plan" }).click({ force: true });
  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });

  await expect(page.getByText("Save a draft first to enable publishing.")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Lưu ngay" }).click();

  await expect(page.getByText("Saved!")).toBeVisible({ timeout: 10000 });
  expect(saveDraftCalled).toBe(true);
  // questionSetId was never set — the "save a draft first" hint is still showing
  // right next to the "Saved!" button, a visible contradiction.
  await expect(page.getByText("Save a draft first to enable publishing.")).toBeVisible();
});

test("RAG024-1 (finding): retryPlan() discards the server's PLAN_REGENERATE_LIMIT reason and shows a generic fallback instead", async ({ page }) => {
  // src/features/interview/services/interview.service.ts's retryPlan() wraps
  // the POST .../retry-plan call in a bare try/catch that returns a plain
  // boolean — the actual error (status, errorCode, message) is discarded.
  // handleRetryPlanFromReview() then shows a hardcoded generic string instead
  // of the specific server-enforced-limit reason, unlike Studio's
  // applySettingsToPlan/generateQuestions paths which route errors through
  // extractErrorMessage() and DO surface the real SUBSCRIPTION_ERROR_MESSAGES
  // canned text ("You've used all plan regenerations for this draft (max 5).").
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) })
  );
  let retryPlanCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/retry-plan", (route) => {
    retryPlanCalled = true;
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ errorCode: "PLAN_REGENERATE_LIMIT" }),
    });
  });

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Regenerate Plan" }).click();
  await expect(page.getByText("Không thể retry plan. Vui lòng thử lại.")).toBeVisible({ timeout: 10000 });
  expect(retryPlanCalled).toBe(true);
  // The real, more informative canned message never appears.
  await expect(page.getByText("You've used all plan regenerations for this draft (max 5).")).not.toBeVisible();
});

test("RAG036-1: editing the question count in plan review sends the new value on Approve", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    route.fallback();
  });
  let putPlanBody: Record<string, unknown> | null = null;
  await page.route("**/api/hr/question-generation-jobs/job-123/plan", (route) => {
    putPlanBody = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("spinbutton")).toHaveValue("10"); // PLAN_PROPOSED_JOB's totalQuestions

  await page.getByRole("spinbutton").fill("25");
  const putPlanResponse = page.waitForResponse((res) => res.url().includes("/job-123/plan") && res.request().method() === "PUT");
  await page.getByRole("button", { name: "Approve Plan" }).click();
  await putPlanResponse;

  expect((putPlanBody as unknown as { totalQuestions?: number })?.totalQuestions).toBe(25);
});

test("RAG-REORDER-1 (finding): a 409 on question reorder is swallowed silently — no error toast, local order stays out of sync with the server", async ({ page }) => {
  // review-questions-section.tsx's persistReorder(): when there's no
  // questionSetId yet, it calls `void reorderJobQuestions(sessionId, items)`
  // with NO .then()/.catch() at all — contrast with the questionSetId branch a
  // few lines above, which DOES show an error toast on failure. interview.service.ts's
  // reorderJobQuestions() also explicitly treats a 409 as "not an error" and
  // returns false without even a console.warn. Net effect: the UI has already
  // applied the new order optimistically (setQuestions(next)), the server
  // rejected it, and the user gets zero indication anything went wrong.
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  let jobPollCount = 0;
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    jobPollCount++;
    if (jobPollCount === 1) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...PLAN_PROPOSED_JOB, phase: "COMPLETED", status: "COMPLETED", ui: { suggestedAction: "REVIEW_QUESTIONS", isPolling: false } }),
    });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/questions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "question-alpha", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium", citations: [], orderIndex: 0 },
        { id: "question-beta", question: "What is dependency injection?", questionType: "Technical", difficulty: "Medium", citations: [], orderIndex: 1 },
      ]),
    })
  );
  let reorderCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/questions/reorder", (route) => {
    reorderCalled = true;
    route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "Job is locked" }) });
  });

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Approve Plan" }).click({ force: true });
  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });

  // Move the first question ("Explain REST vs GraphQL.") down — the UI reorders
  // immediately (optimistic), then fires the (409-rejected) persist call.
  await page.getByTitle("Move down").first().click();
  await page.waitForTimeout(1000);

  expect(reorderCalled).toBe(true);
  // No error toast anywhere — the failure was swallowed. Scoped to z-[9999]
  // specifically: the unrelated background-job progress badge
  // (generation-progress-badge.tsx) coincidentally shares the exact same
  // "fixed bottom-6 right-6" classes as the real toast container, at z-50.
  await expect(page.locator("div.fixed.bottom-6.right-6.z-\\[9999\\]")).toHaveCount(0);
  // The optimistic reorder is still showing client-side, diverged from the
  // (rejected) server state — "What is dependency injection?" now renders first.
  const questionTexts = await page.locator("p, div").filter({ hasText: /^(Explain REST vs GraphQL\.|What is dependency injection\?)$/ }).allTextContents();
  expect(questionTexts[0]).toBe("What is dependency injection?");
});

test("RAG-PLAN-EDIT-1: editing the Role field in plan review sends the edited value on Approve", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    }
    route.fallback();
  });
  let putPlanBody: Record<string, unknown> | null = null;
  await page.route("**/api/hr/question-generation-jobs/job-123/plan", (route) => {
    putPlanBody = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto("/hr/generate");
  const textarea = page.locator("textarea").first();
  await textarea.fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  const roleInput = page.getByPlaceholder("e.g. Frontend Developer");
  await roleInput.fill("Staff Backend Engineer");
  const putPlanResponse = page.waitForResponse((res) => res.url().includes("/job-123/plan") && res.request().method() === "PUT");
  await page.getByRole("button", { name: "Approve Plan" }).click();
  await putPlanResponse;

  expect((putPlanBody as unknown as { roleTitle?: string })?.roleTitle).toBe("Staff Backend Engineer");
});

test("RAG018-1: a Failed question-generation run shows Retry Questions, and retrying resumes to completion", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  let retryQuestionsCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/retry-questions", (route) => {
    retryQuestionsCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  let jobPollCount = 0;
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) => {
    jobPollCount++;
    if (jobPollCount === 1) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) });
    }
    if (!retryQuestionsCalled) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...PLAN_PROPOSED_JOB,
          phase: "FAILED",
          status: "FAILED",
          ui: { suggestedAction: "RETRY_QUESTIONS", isPolling: false, actions: { canRetryQuestions: true } },
          failure: { reason: "RAG service returned a 502 while generating questions." },
        }),
      });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...PLAN_PROPOSED_JOB,
        phase: "COMPLETED",
        status: "COMPLETED",
        ui: { suggestedAction: "REVIEW_QUESTIONS", isPolling: false },
      }),
    });
  });
  await page.route("**/api/hr/question-generation-jobs/job-123/questions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "q-1", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium", citations: [], orderIndex: 0 },
      ]),
    })
  );

  await page.goto("/hr/generate");
  const textarea = page.locator("textarea").first();
  await textarea.fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Approve Plan" }).click({ force: true });

  await expect(page.getByText("RAG service returned a 502 while generating questions.")).toBeVisible({ timeout: 10000 });
  const retryBtn = page.getByRole("button", { name: "Retry Questions" });
  await expect(retryBtn).toBeVisible();
  // Failed state offers recovery, not a dead end — no Retry Plan button since only questions failed.
  await expect(page.getByRole("button", { name: "Retry Plan" })).toHaveCount(0);

  await retryBtn.click();
  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });
  expect(retryQuestionsCalled).toBe(true);
});

test("RAG021-1: reloading mid plan-review restores the session from localStorage without re-submitting the JD", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) })
  );

  await page.goto("/hr/generate");
  const textarea = page.locator("textarea").first();
  await textarea.fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("input").first()).toHaveValue("Senior Backend Developer");

  await page.reload();
  // Restored optimistically from localStorage (hr_gen_job / hr_gen_view / hr_gen_plan)
  // before any network round-trip completes.
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("input").first()).toHaveValue("Senior Backend Developer");
});

test("RAG021-2: a session created under a different account is discarded on login as a new user", async ({ page }) => {
  await mockSession(page, { userId: "hr-user-A" });
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLAN_PROPOSED_JOB) })
  );

  await page.goto("/hr/generate");
  const textarea = page.locator("textarea").first();
  await textarea.fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  // A second HR account (hr-user-B) logs in on the same browser profile — the
  // stale localStorage session belongs to hr-user-A and must not leak across.
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "hr-user-B", fullName: "Tran Thi B", email: "b@example.com", role: "HR_MANAGER" }),
    })
  );
  await page.reload();

  // The plan_review view is not shown for the new owner — session was cleared, form reset.
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Interview Plan")).not.toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue("");
});
