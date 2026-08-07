import { test, expect, mockHrSession, freeSubscriptionReady, type Page } from "./fixtures";

// Grounded in src/features/question/components/review-questions-section.tsx
// (isLocked = publishStatus === "PUBLISHED", gating Add/Edit/Delete/Reorder)
// and src/app/hr/history/[id]/review-client.tsx (fetches publishStatus via
// findQuestionSetForJob AFTER the job loads). Maps to Excel sheet RAG028
// (published-set edit restrictions). Route: /hr/history/{jobId}.

const JOB_ID = "job-500";
const QS_ID = "qs-500";

function completedJob() {
  return {
    jobId: JOB_ID,
    id: JOB_ID,
    phase: "COMPLETED",
    status: "COMPLETED",
    jobTitle: "Senior Backend Developer",
    meta: { hasDraft: true, questionSetId: QS_ID },
    ui: { suggestedAction: "REVIEW_QUESTIONS", isPolling: false },
  };
}

function draftResponse(status: "DRAFT" | "PUBLISHED") {
  return {
    id: QS_ID,
    sourceJobId: JOB_ID,
    title: "Senior Backend Developer",
    status,
    timeLimitMinutes: 45,
    questions: [
      { id: "dq-1", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium", order: 0 },
      { id: "dq-2", question: "What is dependency injection?", questionType: "Technical", difficulty: "Medium", order: 1 },
    ],
  };
}

async function mockReviewPage(page: Page, status: "DRAFT" | "PUBLISHED") {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.route(`**/api/hr/question-generation-jobs/${JOB_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(completedJob()) })
  );
  await page.route("**/api/hr/question-sets", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: QS_ID, jobId: JOB_ID, status }]),
    });
  });
  await page.route(`**/api/hr/question-sets/${QS_ID}`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(draftResponse(status)) });
  });
}

test("RAG028-1: a PUBLISHED question set blocks Add/Edit/Delete/Reorder with a lock hint", async ({ page }) => {
  await mockReviewPage(page, "PUBLISHED");
  await page.goto(`/hr/history/${JOB_ID}`);

  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Published").first()).toBeVisible();
  await expect(
    page.getByText("This set is published — unpublish it first to add, edit, delete, or reorder questions.")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Question" })).toHaveCount(0);
});

test("RAG028-2: a DRAFT (unpublished) question set allows normal editing — no lock hint, Add Question present", async ({ page }) => {
  await mockReviewPage(page, "DRAFT");
  await page.goto(`/hr/history/${JOB_ID}`);

  await expect(page.getByText("Explain REST vs GraphQL.")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(
    page.getByText("This set is published — unpublish it first to add, edit, delete, or reorder questions.")
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Add Question" })).toBeVisible();
});
