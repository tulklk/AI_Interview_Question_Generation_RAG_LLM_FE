import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/interview/components/generate/generate-form.tsx,
// jd-input-card.tsx, file-upload-area.tsx, and src/core/i18n/en.ts
// (`generatePage`). Maps to Excel sheets RAG014/RAG015/RAG010(GenerateForm
// variant)/RAG020. Route: /hr/generate.

function freeSubscription(opts: { cooldownActive: boolean }) {
  return {
    planCode: "FREE",
    planName: "Free",
    audience: "HR",
    status: "ACTIVE",
    priceMonthly: 0,
    currency: "VND",
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-12-31T00:00:00Z",
    lastSuccessfulGenerateAt: opts.cooldownActive ? new Date().toISOString() : null,
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

async function mockSession(page: Page, opts: { cooldownActive?: boolean } = {}) {
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
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(freeSubscription({ cooldownActive: opts.cooldownActive ?? false })),
    })
  );
}

const LONG_JD_400_CHARS_UNDER_100_WORDS =
  // 400+ characters, but only a handful of long/repeated words (<100 words)
  "Requirements ".repeat(35); // ~35 words, ~420 chars

const VALID_JD =
  "We are looking for a Senior Backend Developer to join our growing engineering team. " +
  "You will design, build, and maintain scalable RESTful APIs and microservices using Node.js and TypeScript. " +
  "Responsibilities include collaborating with product managers and frontend engineers to ship new features, " +
  "writing clean and well-tested code, participating in code reviews, and mentoring junior engineers. " +
  "Requirements: 5+ years of backend development experience, strong knowledge of SQL and NoSQL databases, " +
  "experience with Docker and Kubernetes, familiarity with CI/CD pipelines, and excellent communication skills. " +
  "Nice to have: experience with AWS, GraphQL, and event-driven architectures. We offer competitive salary, " +
  "remote-friendly work, and a collaborative engineering culture focused on continuous learning and growth.";

test.beforeEach(async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/generate");
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible();
});

test("RAG014-1: JD under 400 characters shows the too-short hint and blocks submit", async ({ page }) => {
  const textarea = page.locator("textarea").first();
  await textarea.fill("Short JD text under the limit.");
  await expect(page.getByText(/Need \d+ more characters to meet the minimum/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeDisabled();
});

test("RAG014-2: JD >=400 chars but <100 words passes the UI check yet fails the hidden server-side word-count rule", async ({ page }) => {
  const textarea = page.locator("textarea").first();
  await textarea.fill(LONG_JD_400_CHARS_UNDER_100_WORDS);
  // UI rule (400 chars) passes -> button enabled, no orange hint
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeEnabled();
  await page.getByRole("button", { name: "Create Plan" }).click();
  await expect(page.getByText(/Mô tả công việc cần ít nhất 100 từ/)).toBeVisible();
});

test("RAG015-1: an unsupported file type is rejected", async ({ page }) => {
  await page.setInputFiles('input[type="file"]', {
    name: "resume.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake image content"),
  });
  await expect(page.getByText("Invalid file type. Please upload a PDF, DOC, or DOCX file.")).toBeVisible();
});

test("RAG015-2: a file over 10MB is rejected", async ({ page }) => {
  await page.setInputFiles('input[type="file"]', {
    name: "big-jd.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(11 * 1024 * 1024),
  });
  await expect(page.getByText("File is too large. Maximum size is 10MB.")).toBeVisible();
});

test.describe("quota exceeded (Free plan in cooldown)", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, { cooldownActive: true });
    await page.goto("/hr/generate");
  });

  test("RAG010-GF-1: shows the inline amber banner, not a blocking modal", async ({ page }) => {
    await expect(page.getByText("Monthly limit reached")).toBeVisible();
    // The rest of the form remains usable — contrasts with Studio's full-page block.
    await expect(page.locator("textarea").first()).toBeEditable();
  });

  test("RAG010-GF-2: submit is disabled while quota is blocked", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await textarea.fill(VALID_JD);
    await expect(page.getByRole("button", { name: "Create Plan" })).toBeDisabled();
  });

  test("RAG010-GF-3: \"Create manually\" link points at /hr/generate/manual", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Create manually" }).last()).toHaveAttribute(
      "href",
      "/hr/generate/manual/"
    );
  });
});

test("RAG017-1: a valid JD submits and transitions to the plan-review step", async ({ page }) => {
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobId: "job-123", id: "job-123" }),
    })
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
          skills: ["Node.js", "TypeScript"],
        },
      }),
    })
  );

  const textarea = page.locator("textarea").first();
  await textarea.fill(VALID_JD);
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeEnabled();
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  // "Interview Plan" heading confirms the view transitioned form -> plan_review;
  // the role/difficulty/experience fields are inputs, so check the Role value directly.
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("input").first()).toHaveValue("Senior Backend Developer");
});

test("RAG016-1 (finding): the plan-creation payload always hardcodes numberOfQuestions/difficulty/questionTypes — there is no UI to change them before generating a plan", async ({ page }) => {
  // handleSubmitForm() in generate-form.tsx sends fixed values
  // (numberOfQuestions: 10, difficulty: "medium", questionTypes: ["technical",
  // "behavioral"]) regardless of what the HR user might want — there's no
  // input control anywhere on the "form" step for count/difficulty/types.
  // (Studio's generate-v2 flow DOES expose these via its settings panel;
  // GenerateForm's quick-generate flow does not.)
  let capturedBody: Record<string, unknown> | null = null;
  await page.route("**/api/hr/question-generation-jobs/plan", (route) => {
    capturedBody = route.request().postDataJSON();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-999", id: "job-999" }) });
  });
  await page.route("**/api/hr/question-generation-jobs/job-999", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-999", phase: "PLAN_PROPOSED", status: "PLAN_PROPOSED", jobTitle: "x",
        ui: { suggestedAction: "REVIEW_PLAN", isPolling: false },
        plan: { roleTitle: "x", experienceLevel: "senior", difficulty: "medium", totalQuestions: 10, questionTypes: ["Technical"], skills: [] },
      }),
    })
  );

  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  expect(capturedBody).toMatchObject({
    numberOfQuestions: 10,
    difficulty: "medium",
    questionTypes: ["technical", "behavioral"],
  });
});
