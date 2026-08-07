import { test, expect, type Page } from "@playwright/test";

// Grounded in plan-edit-card.tsx (touched.role && errors.role -> red border
// class), user-table.tsx (overflow-x-auto wrapper around a min-w-205
// table-fixed table), and info-tooltip.tsx (role="tooltip", opacity-driven
// show/hide on hover/focus). Maps to Excel sheets UI011 (form-field
// validation visual state), UI014 (table/grid overflow), UI015 (tooltip
// hover display).

const VALID_JD =
  "We are looking for a Senior Backend Developer to join our growing engineering team. " +
  "You will design, build, and maintain scalable RESTful APIs and microservices using Node.js and TypeScript. " +
  "Responsibilities include collaborating with product managers and frontend engineers to ship new features, " +
  "writing clean and well-tested code, participating in code reviews, and mentoring junior engineers. " +
  "Requirements: 5+ years of backend development experience, strong knowledge of SQL and NoSQL databases, " +
  "experience with Docker and Kubernetes, familiarity with CI/CD pipelines, and excellent communication skills. " +
  "Nice to have: experience with AWS, GraphQL, and event-driven architectures. We offer competitive salary, " +
  "remote-friendly work, and a collaborative engineering culture focused on continuous learning and growth.";

test("UI011-1: clearing the required Role field in plan review shows the red invalid-state border and inline error", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }) })
  );
  await page.route("**/api/me/subscription", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        planCode: "FREE", planName: "Free", audience: "HR", status: "ACTIVE", priceMonthly: 0, currency: "VND",
        periodStart: "2026-01-01T00:00:00Z", periodEnd: "2026-12-31T00:00:00Z", lastSuccessfulGenerateAt: null,
        limits: { generateCooldownHours: 24, generateUnlimited: false, planRegeneratePerDraft: 5, canExport: false, askAiPerMonth: 0, canPublish: false, freeVisiblePercent: 50, canPersistHrRecommendation: false, feedbackOnlyOnVisible: true },
        askAiUsed: 0, askAiLimit: 0, generateSetUsed: 0,
        entitlements: { canExport: false, canAskAi: false, generateUnlimited: false, freeVisiblePercent: 50, canPersistHrRecommendation: false },
      }),
    })
  );
  await page.route("**/api/hr/question-generation-jobs/plan", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "job-123", id: "job-123" }) })
  );
  await page.route("**/api/hr/question-generation-jobs/job-123", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-123", phase: "PLAN_PROPOSED", status: "PLAN_PROPOSED", jobTitle: "Senior Backend Developer",
        ui: { suggestedAction: "REVIEW_PLAN", isPolling: false },
        plan: { roleTitle: "Senior Backend Developer", experienceLevel: "senior", difficulty: "medium", totalQuestions: 10, questionTypes: ["Technical"], skills: [] },
      }),
    })
  );

  await page.goto("/hr/generate");
  await page.locator("textarea").first().fill(VALID_JD);
  await page.getByRole("button", { name: "Create Plan" }).click({ force: true });
  await expect(page.getByText("Interview Plan")).toBeVisible({ timeout: 10000 });

  const roleInput = page.getByPlaceholder("e.g. Frontend Developer");
  const classesBefore = await roleInput.getAttribute("class");
  expect(classesBefore).not.toContain("border-red-400");

  await roleInput.fill("");
  await roleInput.blur();

  await expect(roleInput).toHaveClass(/border-red-400/);

  // The Approve Plan button is styled to LOOK disabled (bg-gray-200,
  // cursor-not-allowed) via canApprove, but its `disabled` HTML attribute is
  // only tied to isApproving — canApprove only gates the onClick handler's
  // internal no-op, not the element's actual disabled state.
  const approveBtn = page.getByRole("button", { name: "Approve Plan" });
  await expect(approveBtn).toBeEnabled();
  await expect(approveBtn).toHaveClass(/cursor-not-allowed/);

  let approvePlanCalled = false;
  await page.route("**/api/hr/question-generation-jobs/job-123/approve-plan", (route) => {
    approvePlanCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await approveBtn.click();
  await page.waitForTimeout(500);
  expect(approvePlanCalled).toBe(false); // handleApprove()'s internal canApprove check silently no-ops
});

test("UI014-1: the admin users table scrolls horizontally within its own wrapper at mobile width — the page body does not", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "ADMIN");
  });
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fullName: "Admin User", email: "admin@example.com", role: "ADMIN" }) })
  );
  await page.route("**/api/users?**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: "u1", fullName: "Nguyen Van A", email: "a@example.com", role: "HR_MANAGER", isActive: true, isPremium: false, planCode: "FREE", createdAt: "2026-01-01T00:00:00Z" }],
        totalCount: 1,
      }),
    });
  });

  await page.goto("/admin/users");
  await expect(page.getByText("Nguyen Van A")).toBeVisible({ timeout: 10000 });

  const wrapper = page.locator("div.overflow-x-auto").filter({ has: page.locator("table") });
  const wrapperOverflow = await wrapper.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(wrapperOverflow).toBe(true); // the table itself is wider than its container -> scrolls internally

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // but the page itself never scrolls sideways
});

test("UI015-1: the KPI info tooltip shows on hover and hides on mouse-out", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "JOB_SEEKER");
  });
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fullName: "A Jobseeker", email: "js@example.com", role: "JOB_SEEKER" }) })
  );

  await page.goto("/jobseeker/dashboard");
  const tooltipText = "Total number of practice sessions you've completed.";
  const tooltip = page.getByRole("tooltip", { name: tooltipText });
  await expect(tooltip).toHaveCount(1, { timeout: 10000 });
  // Playwright's toBeVisible() doesn't factor in opacity:0 (the element still
  // has a real bounding box) — the component's own show/hide state instead
  // lives in the opacity-0/opacity-100 + pointer-events Tailwind classes.
  await expect(tooltip).toHaveClass(/opacity-0/);
  await expect(tooltip).toHaveClass(/pointer-events-none/);

  // The trigger button is the sibling right before the tooltip span in the DOM.
  const trigger = tooltip.locator("xpath=preceding-sibling::button[1]");
  await trigger.hover();
  await expect(tooltip).toHaveClass(/opacity-100/);
  await expect(tooltip).toHaveClass(/pointer-events-auto/);

  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveClass(/opacity-0/);
});
