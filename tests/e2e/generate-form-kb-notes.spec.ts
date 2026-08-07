import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/interview/components/generate/kb-doc-picker.tsx
// (client-side READY-status filter on top of getHrKnowledgeDocs()) and
// generate-form.tsx's handleSubmitForm (hrNote / knowledgeDocumentId payload
// fields). Maps to Excel sheets RAG025 (KB doc picker), RAG026 (Notes for AI).
// Route: /hr/generate.

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
      generateCooldownHours: 24, generateUnlimited: false, planRegeneratePerDraft: 5,
      canExport: false, askAiPerMonth: 0, canPublish: false, freeVisiblePercent: 50,
      canPersistHrRecommendation: false, feedbackOnlyOnVisible: true,
    },
    askAiUsed: 0, askAiLimit: 0, generateSetUsed: 0,
    entitlements: {
      canExport: false, canAskAi: false, generateUnlimited: false,
      freeVisiblePercent: 50, canPersistHrRecommendation: false,
    },
  };
}

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
  await page.route("**/api/me/subscription", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(freeSubscriptionReady()) })
  );
}

function doc(id: string, fileName: string, status: string) {
  return { id, fileName, status, createdAt: new Date().toISOString() };
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

test("RAG025-1: only READY documents appear in the KB picker — PROCESSING/FAILED/PENDING are filtered out client-side", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/knowledge-documents*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        doc("d1", "job-requirements-ready.pdf", "READY"),
        doc("d2", "still-processing.pdf", "PROCESSING"),
        doc("d3", "failed-ingest.pdf", "FAILED"),
        doc("d4", "queued.pdf", "PENDING"),
        doc("d5", "another-ready.docx", "READY"),
      ]),
    })
  );

  await page.goto("/hr/generate");
  await expect(page.getByText("Select document from Knowledge Base")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("job-requirements-ready.pdf")).toBeVisible();
  await expect(page.getByText("another-ready.docx")).toBeVisible();
  await expect(page.getByText("still-processing.pdf")).not.toBeVisible();
  await expect(page.getByText("failed-ingest.pdf")).not.toBeVisible();
  await expect(page.getByText("queued.pdf")).not.toBeVisible();
});

test("RAG025-2: no READY documents shows the empty state with an upload-to-KB CTA", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/knowledge-documents*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([doc("d1", "still-processing.pdf", "PROCESSING")]),
    })
  );

  await page.goto("/hr/generate");
  await expect(page.getByText("No documents ready")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("still-processing.pdf")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Upload to Knowledge Base" })).toHaveAttribute("href", "/hr/knowledge/");
});

test("RAG025-3: selecting a KB document includes its id in the plan-creation payload", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/hr/knowledge-documents*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([doc("d1", "job-requirements.pdf", "READY")]) })
  );
  let capturedBody: Record<string, unknown> | null = null;
  await page.route("**/api/hr/question-generation-jobs/plan", (route) => {
    capturedBody = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-1", id: "job-1" }) });
  });
  await page.route("**/api/hr/question-generation-jobs/job-1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-1", phase: "PLAN_PROPOSED", status: "PLAN_PROPOSED", jobTitle: "x",
        ui: { suggestedAction: "REVIEW_PLAN", isPolling: false },
        plan: { roleTitle: "x", experienceLevel: "senior", difficulty: "medium", totalQuestions: 10, questionTypes: ["Technical"], skills: [] },
      }),
    })
  );

  await page.goto("/hr/generate");
  await expect(page.getByText("job-requirements.pdf")).toBeVisible({ timeout: 10000 });
  await page.getByText("job-requirements.pdf").click();

  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  expect(capturedBody).not.toBeNull();
  expect((capturedBody as unknown as { knowledgeDocumentId?: string }).knowledgeDocumentId).toBe("d1");
});

test("RAG026-1: text entered in the Notes for AI field is sent as hrNote on submit", async ({ page }) => {
  await mockSession(page);
  let capturedBody: Record<string, unknown> | null = null;
  await page.route("**/api/hr/question-generation-jobs/plan", (route) => {
    capturedBody = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-1", id: "job-1" }) });
  });
  await page.route("**/api/hr/question-generation-jobs/job-1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-1", phase: "PLAN_PROPOSED", status: "PLAN_PROPOSED", jobTitle: "x",
        ui: { suggestedAction: "REVIEW_PLAN", isPolling: false },
        plan: { roleTitle: "x", experienceLevel: "senior", difficulty: "medium", totalQuestions: 10, questionTypes: ["Technical"], skills: [] },
      }),
    })
  );

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByPlaceholder("e.g. Focus on System Design, interview in English, prioritize practical questions...").fill(
    "Focus on distributed systems and prior on-call experience."
  );
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  expect((capturedBody as unknown as { hrNote?: string })?.hrNote).toBe("Focus on distributed systems and prior on-call experience.");
});
