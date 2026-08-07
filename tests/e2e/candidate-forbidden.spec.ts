import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/candidate/services/practice-session.service.ts's
// ForbiddenError (thrown when the BE 403s — the practice session/question set
// belongs to a different candidate) and practice-session.tsx's startForbidden
// render branch. Maps to Excel sheet RGA016 (CandidateForbiddenErrorMessages).
// Route: /jobseeker/practice/{id}.

async function mockJobseekerSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "JOB_SEEKER");
  });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fullName: "A Jobseeker", email: "js@example.com", role: "JOB_SEEKER" }),
    })
  );
}

const SET_ID = "qs-forbidden-1";

function questionSetBody() {
  return {
    id: SET_ID,
    title: "Senior Backend Developer",
    companyName: "Acme Corp",
    totalQuestions: 1,
    questions: [
      { id: "q-1", question: "Explain REST vs GraphQL.", questionType: "technical", difficulty: "Medium", isLocked: false },
    ],
  };
}

test("RGA016-1: a 403 starting a practice session for someone else's session shows the friendly \"no access\" message, not a raw error", async ({ page }) => {
  await mockJobseekerSession(page);
  await page.route(`**/api/candidate/question-sets/${SET_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(questionSetBody()) })
  );
  let startCalled = false;
  await page.route("**/api/candidate/practice-sessions", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    startCalled = true;
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Forbidden" }) });
  });

  await page.goto(`/jobseeker/practice/${SET_ID}`);
  await expect(page.getByText("You don't have access to practice this question set.")).toBeVisible({ timeout: 10000 });
  expect(startCalled).toBe(true);
  // No raw technical error text (status code, stack, "Request failed…") leaks to the candidate.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("403");
  expect(bodyText.toLowerCase()).not.toContain("request failed");
});

test("RGA016-2: a plain 500 on the same call falls through to the generic start-error state instead of the forbidden message", async ({ page }) => {
  // Contrast case: rethrowForbidden() only special-cases status === 403 —
  // confirms the friendly copy above is really keyed off the 403 status, not
  // just "any error while starting".
  await mockJobseekerSession(page);
  await page.route(`**/api/candidate/question-sets/${SET_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(questionSetBody()) })
  );
  await page.route("**/api/candidate/practice-sessions", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });

  await page.goto(`/jobseeker/practice/${SET_ID}`);
  await expect(page.getByText("Failed to start the practice session.")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("You don't have access to practice this question set.")).not.toBeVisible();
});
