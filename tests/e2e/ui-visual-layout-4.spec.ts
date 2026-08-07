import { test, expect, mockHrSession, freeSubscriptionReady } from "./fixtures";

// Grounded in file-upload-area.tsx (drag-over border/bg color swap),
// sidebar.tsx + top-header.tsx (mobile drawer aria-hidden toggle),
// brand-logo.tsx (shared component reused by both AuthLayout and the HR
// sidebar), and ai-loading-spinner.tsx (.ai-spin-* classes). Maps to Excel
// sheets UI009 (dropzone), UI012 (sidebar responsive), UI016 (loading
// spinner), UI018 (branding consistency).

test("UI009-1: the JD file dropzone highlights on dragover and reverts on dragleave", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.goto("/hr/generate");
  await expect(page.getByText("Drag & drop a file, or click to browse")).toBeVisible({ timeout: 10000 });

  const dropzone = page.locator("div.border-dashed").first();
  const classesBefore = await dropzone.getAttribute("class");
  expect(classesBefore).not.toContain("border-[#6c47ff]");

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await dropzone.dispatchEvent("dragover", { dataTransfer });
  const classesDuring = await dropzone.getAttribute("class");
  expect(classesDuring).toContain("border-[#6c47ff]");

  await dropzone.dispatchEvent("dragleave");
  const classesAfter = await dropzone.getAttribute("class");
  expect(classesAfter).not.toContain("border-[#6c47ff]");
});

test("UI012-1: the mobile sidebar drawer starts hidden, opens via the hamburger, and closes via the backdrop", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  const drawer = page.locator("div.lg\\:hidden.fixed.inset-0.z-40");
  await expect(drawer).toHaveAttribute("aria-hidden", "true");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();

  // Click the backdrop (top-left corner, outside the drawer panel itself).
  await drawer.click({ position: { x: 350, y: 20 } });
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
});

test("UI018-1: the same HireGen AI logo asset renders on the public login page and inside the HR sidebar", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/login");
  const loginLogo = page.getByAltText("HireGen AI");
  await expect(loginLogo).toBeVisible({ timeout: 10000 });
  await expect(loginLogo).toHaveAttribute("src", /logo\.png/);

  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.goto("/hr/generate/manual");
  // Both the desktop sidebar and the (CSS-hidden) mobile drawer render their
  // own copy of BrandLogo simultaneously in the DOM — scope to the first.
  const sidebarLogo = page.getByAltText("HireGen AI").first();
  await expect(sidebarLogo).toBeVisible({ timeout: 10000 });
  await expect(sidebarLogo).toHaveAttribute("src", /logo\.png/);
});

test("UI016-1: the AI loading spinner renders with its status text while a plan is being generated", async ({ page }) => {
  await mockHrSession(page, { subscription: freeSubscriptionReady() });
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  // Deliberately slow poll response so the "polling" view/spinner is observable.
  await page.route("**/api/hr/question-generation-jobs/job-123", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-123", phase: "PLAN_PROPOSED", status: "PLAN_PROPOSED", jobTitle: "x",
        ui: { suggestedAction: "REVIEW_PLAN", isPolling: false },
        plan: { roleTitle: "x", experienceLevel: "senior", difficulty: "medium", totalQuestions: 10, questionTypes: ["Technical"], skills: [] },
      }),
    });
  });

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(
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

  await expect(page.getByText("Generating plan...")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".ai-spin-outer")).toBeVisible();
  await expect(page.locator(".ai-spin-glow")).toBeVisible();

  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".ai-spin-outer")).toHaveCount(0);
});
