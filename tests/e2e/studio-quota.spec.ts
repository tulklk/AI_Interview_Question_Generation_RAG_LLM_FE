import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/studio/components/studio-page.tsx (the quota-exceeded
// alertdialog block) and src/core/i18n/en.ts (`hrSubscription`). Maps to Excel
// sheet RAG010 (Studio variant). Route: /hr/generate-question (renamed from the
// old /hr/generate-v2, which no longer has a page.tsx - only stray
// page.tsx.backup.* files remain in that folder).
//
// Studio's bootstrap (use-studio.ts:78-133) needs GET /api/studio/projects to
// resolve to a real array with >=1 project, or it tries to auto-create one and
// re-list; every other bootstrap call (job description, documents, plan,
// settings, chat, plans, generation runs) is individually wrapped in .catch(),
// so only the projects list needs a real mock for the page to finish loading.
//
// OPEN BUG (found 2026-08-10, not yet root-caused): on a **production build**
// (`next build && next start`) only - does NOT reproduce under `next dev` - the
// quota alertdialog renders correctly for an instant, then the page crashes with
// a client-side exception `k.some is not a function` (minified), which Next.js's
// error boundary turns into a failed background navigation to /hr/dashboard
// (net::ERR_ABORTED) and the tab falls back to Chrome's "This page couldn't
// load" interstitial. Reproduces with a fully mocked backend (no real API
// involved), so it's a real client-side bug, most likely in the billing/premium-
// celebration wiring that app-shell.tsx gained recently (it now wraps every HR
// page, including Studio). RAG010-ST-1/2/3/6 and RAG020-1 below currently FAIL
// because of this - that is the tests correctly catching a real bug, not a
// problem with the test code. Left failing intentionally until someone
// root-causes the crash in app code; do not "fix" these tests without first
// fixing the underlying bug.

function freeSubscriptionInCooldown() {
  return {
    planCode: "FREE",
    planName: "Free",
    audience: "HR",
    status: "ACTIVE",
    priceMonthly: 0,
    currency: "VND",
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-12-31T00:00:00Z",
    lastSuccessfulGenerateAt: new Date().toISOString(),
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

function freeSubscriptionReady() {
  const sub = freeSubscriptionInCooldown();
  return { ...sub, lastSuccessfulGenerateAt: null };
}

async function mockStudioBootstrap(page: Page) {
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "proj-1", name: "Interview Plan Studio" }]),
    });
  });
  // Each of these is individually wrapped in .catch() in use-studio.ts's
  // bootstrap(), but the *shape* still needs to be array/null-safe or the
  // synchronous code right after Promise.all throws (caught by Next's error
  // boundary, not React state) — e.g. getCurrentPlan() only returns null on a
  // real 204, so a 200 {} body is treated as a truthy (but malformed) plan.
  await page.route("**/api/studio/projects/proj-1/job-description", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/studio/projects/proj-1/knowledge-documents", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("**/api/studio/projects/proj-1/plans/current", (route) =>
    route.fulfill({ status: 204, body: "" })
  );
  await page.route("**/api/studio/projects/proj-1/settings", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/studio/projects/proj-1/chat/messages", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("**/api/studio/projects/proj-1/plans", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("**/api/studio/projects/proj-1/question-generation-runs", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
}

async function mockSession(page: Page, subscription: unknown) {
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
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(subscription) })
  );
  await mockStudioBootstrap(page);
}

test("RAG010-ST-1: Free plan in cooldown shows a full-page blocking alertdialog", async ({ page }) => {
  await mockSession(page, freeSubscriptionInCooldown());
  await page.goto("/hr/generate-question");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByText("Daily generation limit reached")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "View plans & billing" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Create manually" })).toBeVisible();
});

test("RAG020-1 (finding): the same generateCooldownHours gate is labeled inconsistently across entry points", async ({ page }) => {
  // Both /hr/generate (GenerateForm) and /hr/generate-question (Studio) gate on the
  // exact same subscription field (limits.generateCooldownHours, 24h here) via
  // useHrSubscription()'s canGenerateNow — but GenerateForm's copy
  // (t.generatePage.quota.exceededTitle) says "Monthly limit reached" /
  // "wait until next cycle", while Studio's copy for the identical condition
  // correctly says "Daily generation limit reached". Same rule, contradictory
  // user-facing explanation of when it resets.
  await mockSession(page, freeSubscriptionInCooldown());
  await page.goto("/hr/generate-question");
  await expect(page.getByRole("alertdialog").getByText("Daily generation limit reached")).toBeVisible({ timeout: 10000 });

  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }) })
  );
  await page.route("**/api/me/subscription", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(freeSubscriptionInCooldown()) })
  );
  await page.goto("/hr/generate");
  await expect(page.getByText("Monthly limit reached")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/wait until next cycle/)).toBeVisible();
  // The gate is the same 24h cooldown as Studio's — never resets monthly, so
  // this copy actively misleads the HR user about when they can generate again.
  await expect(page.getByText("Daily generation limit reached")).not.toBeVisible();
});

test("RAG010-ST-2: the blocking dialog covers the content area (main page content is not directly clickable)", async ({ page }) => {
  await mockSession(page, freeSubscriptionInCooldown());
  await page.goto("/hr/generate-question");
  await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 10000 });
  // The overlay sits at a high z-index with pointer-events on, over the whole content area.
  const overlay = page.locator("div.pointer-events-auto.flex.flex-1.items-center.justify-center");
  await expect(overlay).toBeVisible();
});

test("RAG010-ST-3: \"Create manually\" navigates to /hr/generate-question/manual", async ({ page }) => {
  await mockSession(page, freeSubscriptionInCooldown());
  await page.goto("/hr/generate-question");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await dialog.getByRole("button", { name: "Create manually" }).click();
  await page.waitForURL("**/hr/generate-question/manual/**", { timeout: 5000 });
  expect(page.url()).toContain("/hr/generate-question/manual");
});

test("RAG010-ST-4: no dialog and the Studio page is fully usable when quota is not exceeded", async ({ page }) => {
  await mockSession(page, freeSubscriptionReady());
  await page.goto("/hr/generate-question");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

// Grounded in studio-page.tsx's isRunInProgress/showQuotaDialog logic (merged after
// 185e0cf): the quota dialog is now suppressed while a generation run bootstrap-restores
// as Generating/Pending, and reappears automatically once that run resolves.

test("RAG010-ST-5: the blocking dialog is suppressed while a generation run is already in flight", async ({ page }) => {
  await mockSession(page, freeSubscriptionInCooldown());
  // Override the bootstrap's runs-list mock: restore an in-flight run instead of [].
  await page.route("**/api/studio/projects/proj-1/question-generation-runs", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "run-1",
          planId: "plan-1",
          status: "Generating",
          requestedQuestionCount: 10,
          generatedQuestionCount: 3,
          startedAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.goto("/hr/generate-question");
  await page.waitForTimeout(2000);
  // Quota is exceeded (freeSubscriptionInCooldown) but a run is in flight — dialog must stay hidden.
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("RAG010-ST-6: the dialog surfaces automatically once the in-flight run completes", async ({ page }) => {
  await mockSession(page, freeSubscriptionInCooldown());
  await page.route("**/api/studio/projects/proj-1/question-generation-runs", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "run-1",
          planId: "plan-1",
          status: "Generating",
          requestedQuestionCount: 10,
          generatedQuestionCount: 7,
          startedAt: new Date().toISOString(),
        },
      ]),
    });
  });
  // The 3s background poll (use-studio.ts) calls this single-run endpoint; report Completed.
  await page.route("**/api/studio/projects/proj-1/question-generation-runs/run-1", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "run-1",
        planId: "plan-1",
        status: "Completed",
        requestedQuestionCount: 10,
        generatedQuestionCount: 10,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }),
    });
  });

  await page.goto("/hr/generate-question");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // Background poll fires every 3s; give it time to land and flip the run to Completed.
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible({ timeout: 8000 });
  await expect(dialog.getByText("Daily generation limit reached")).toBeVisible();
});
