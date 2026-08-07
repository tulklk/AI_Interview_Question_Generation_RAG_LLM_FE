import { test, expect, type Page } from "@playwright/test";

// Grounded in src/core/interceptors/auth.interceptor.ts and
// src/core/auth/token.service.ts. Maps to Excel sheets RGA001/RGA002/RGA004/
// RGA013 (HRRAGAuthErrorHandling). Route used: /hr/generate/manual — it makes
// no API calls of its own, but AppShell always fires GET /api/users/me on
// mount, which is a convenient, minimal trigger point for the 401 interceptor.

async function seedTokens(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "expired.jwt.token");
    localStorage.setItem("interviewai_refresh_token", "some-refresh-token");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });
}

/** Same seed, but guarded to run only on the FIRST document load in this page.
 * addInitScript re-fires on every navigation within the same page — including
 * the hard redirect to /login that clearAuth() triggers — so an unguarded
 * seed would silently re-write the stale tokens right back after they're
 * cleared, defeating any assertion that checks post-redirect state. */
async function seedTokensOnce(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("__e2e_seeded__")) return;
    sessionStorage.setItem("__e2e_seeded__", "1");
    localStorage.setItem("interviewai_access_token", "expired.jwt.token");
    localStorage.setItem("interviewai_refresh_token", "some-refresh-token");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });
}

test("RGA001-1: a 401 followed by a successful refresh transparently retries the request", async ({ page }) => {
  await seedTokens(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  let usersMeCalls = 0;
  await page.route("**/api/users/me", (route) => {
    usersMeCalls++;
    if (usersMeCalls === 1) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Unauthorized" }),
      });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }),
    });
  });
  await page.route("**/api/auth/refresh-token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "new.jwt.token", refreshToken: "new-refresh-token" }),
    })
  );

  // ManualQuestionPage itself makes no API calls, so its heading renders
  // regardless of whether /api/users/me (fired by AppShell) has resolved yet —
  // wait for the retried call specifically, not just the heading, to avoid a
  // race between rendering and the interceptor's refresh-and-retry completing.
  const retriedCall = page.waitForResponse(
    (res) => res.url().includes("/api/users/me") && res.status() === 200,
    { timeout: 10000 }
  );
  await page.goto("/hr/generate/manual");
  await retriedCall;
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({
    timeout: 10000,
  });
  expect(page.url()).toContain("/hr/generate/manual");
  // No redirect to /login happened — the silent refresh+retry kept the session alive.
  expect(usersMeCalls).toBeGreaterThanOrEqual(1);
});

test("RGA002-1: a 401 with a failed refresh clears auth and hard-redirects to /login, with no toast", async ({ page }) => {
  await seedTokens(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) })
  );
  await page.route("**/api/auth/refresh-token", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Invalid refresh token" }) })
  );

  await page.goto("/hr/generate/manual");
  await page.waitForURL("**/login/**", { timeout: 10000 });
  expect(page.url()).toContain("/login");

  // No "session expired" toast anywhere — the codebase has no such string tied to this path.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.toLowerCase()).not.toContain("session expired");
  expect(bodyText.toLowerCase()).not.toContain("please log in again");

  // clearAuth() removed the tokens.
  const accessToken = await page.evaluate(() => localStorage.getItem("interviewai_access_token"));
  expect(accessToken).toBeNull();
});

test("RGA003-1: no refresh token at all skips the network call and redirects immediately", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "expired.jwt.token");
    // deliberately no interviewai_refresh_token
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) })
  );
  let refreshCalled = false;
  await page.route("**/api/auth/refresh-token", (route) => {
    refreshCalled = true;
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
  });

  await page.goto("/hr/generate/manual");
  await page.waitForURL("**/login/**", { timeout: 10000 });
  expect(page.url()).toContain("/login");
  expect(refreshCalled).toBe(false);
});

test("RGA004-1: a 401 on the refresh endpoint itself clears auth and redirects, without retrying refresh again", async ({ page }) => {
  await seedTokens(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) })
  );
  let refreshCallCount = 0;
  await page.route("**/api/auth/refresh-token", (route) => {
    refreshCallCount++;
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Refresh token expired" }) });
  });

  await page.goto("/hr/generate/manual");
  await page.waitForURL("**/login/**", { timeout: 10000 });
  // refreshInFlight de-dupes concurrent calls but this is a single 401 -> single refresh attempt.
  expect(refreshCallCount).toBe(1);
});

test("RGA006-1: 401 on the login endpoint itself does not trigger the refresh/redirect interceptor", async ({ page }) => {
  // No tokens seeded — this exercises the "public auth endpoint" branch, not a
  // logged-in session's 401. Covered functionally already by login.spec.ts's
  // AUTH002-3, restated here explicitly against the interceptor's own logic:
  // isRefreshRequest / isPublicAuthEndpoint both short-circuit before any
  // refresh attempt for /api/auth/login.
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  let refreshCalled = false;
  await page.route("**/api/auth/refresh-token", (route) => {
    refreshCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Invalid credentials" }) })
  );

  await page.goto("/login");
  await page.waitForTimeout(1200);
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("••••••••").fill("wrongpassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await expect(page.getByText("Email or password is incorrect. Please try again.")).toBeVisible();
  expect(refreshCalled).toBe(false);
  expect(page.url()).toContain("/login"); // stayed on the login page, no interceptor redirect
});

test("RGA005-1: a 403 response is not special-cased — no refresh attempt, no redirect, page stays put", async ({ page }) => {
  // auth.interceptor.ts's response handler checks `status !== 401` and returns
  // early for anything else, so a 403 (distinct from an expired/invalid token)
  // is left to whatever called the API — it never triggers the refresh/redirect
  // machinery built for 401s.
  await seedTokens(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Forbidden" }) })
  );
  let refreshCalled = false;
  await page.route("**/api/auth/refresh-token", (route) => {
    refreshCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000); // give any (absent) redirect logic a chance to fire
  expect(page.url()).toContain("/hr/generate/manual");
  expect(refreshCalled).toBe(false);
  const accessToken = await page.evaluate(() => localStorage.getItem("interviewai_access_token"));
  expect(accessToken).toBe("expired.jwt.token"); // clearAuth() was never called
});

test("RGA005-1: a 401 on an already-retried request clears auth and redirects, without attempting a second refresh", async ({ page }) => {
  // auth.interceptor.ts checks `original._retry` before attempting another
  // refresh: a request that was already retried once (post-refresh) and still
  // gets a 401 is treated as a hard failure, not looped into another refresh.
  await seedTokensOnce(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  let usersMeCalls = 0;
  await page.route("**/api/users/me", (route) => {
    usersMeCalls++;
    // Every call 401s — including the retried one after refresh succeeds.
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) });
  });
  let refreshCallCount = 0;
  await page.route("**/api/auth/refresh-token", (route) => {
    refreshCallCount++;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "new.jwt.token", refreshToken: "new-refresh-token" }),
    });
  });

  await page.goto("/hr/generate/manual");
  await page.waitForURL("**/login/**", { timeout: 10000 });
  expect(page.url()).toContain("/login");
  expect(refreshCallCount).toBe(1); // refreshed once, retried once, then gave up — no second refresh attempt
  expect(usersMeCalls).toBe(2); // original + one retry
  const accessToken = await page.evaluate(() => localStorage.getItem("interviewai_access_token"));
  expect(accessToken).toBeNull();
});

test("RGA008-1 (finding): HR routes have no role gate — a Jobseeker-role session still renders the HR page normally", async ({ page }) => {
  // Contrast with admin-access-control.spec.ts's AUTH006 tests, which prove
  // /admin/* routes DO check role (except one unguarded page, also flagged
  // there). No equivalent guard exists anywhere under src/app/hr — app-shell.tsx
  // renders unconditionally regardless of interviewai_user_role.
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

  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });
  expect(page.url()).toContain("/hr/generate/manual"); // no redirect to /jobseeker or /login
});

test("RGA011-1 (finding): a bare 5xx with no error body surfaces axios's raw technical message, not a friendly one", async ({ page }) => {
  // extractErrorMessage() only maps errorCode -> canned text, or falls back to
  // response.data.detail/title/message/error — a genuinely empty error body
  // falls all the way through to axiosErr.message, which is axios's own
  // generic "Request failed with status code 500" string. No code path ever
  // substitutes a user-friendly "Something went wrong, try again" message for
  // this case in the Studio generate flow.
  await seedTokens(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }) })
  );
  const PROJECT_ID = "proj-1";
  await page.route("**/api/studio/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: PROJECT_ID, name: "x" }]) });
  });
  await page.route(`**/api/studio/projects/${PROJECT_ID}/job-description`, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/knowledge-documents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans/current`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "plan-1", projectId: PROJECT_ID, revision: 1, title: "x", status: "Approved", totalQuestions: 1,
        interviewLengthMinutes: 60, difficulty: "Medium", difficultyMix: { easy: 0, medium: 1, hard: 0 },
        focusAreas: [{ name: "x", weight: 1, orderIndex: 0 }], sourcesUsed: [], estimatedSections: [], sections: [], concurrencyVersion: "v1",
      }),
    })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/settings`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        projectId: PROJECT_ID, appliedPlanId: "plan-1", interviewLengthMinutes: 60, numberOfQuestions: 1, difficulty: "Medium",
        questionTone: "Professional", includeSampleAnswers: true, includeScoringRubric: true, outputFormat: "StructuredInterviewKit",
        outputLanguage: "Vietnamese", questionTypes: ["technical"],
        readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true },
      }),
    })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/chat/messages`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/plans`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/question-generation-runs`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions?*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 100, total: 0, items: [] }) })
  );
  await page.route(`**/api/studio/projects/${PROJECT_ID}/questions/generate`, (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
  );

  await page.goto("/hr/generate-v2");
  const generateBtn = page.getByRole("button", { name: "Generate Questions" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  await expect(page.locator("div.fixed.bottom-6.right-6.z-\\[9999\\]").getByText(/Request failed with status code 500/)).toBeVisible({ timeout: 10000 });
});

test("RGA017-1 (finding): access/refresh tokens are stored in plain localStorage, not an httpOnly cookie", async ({ page }) => {
  // Anything with JS execution on the page (including a successful XSS) can
  // read these directly via localStorage.getItem — an httpOnly cookie would
  // not be readable from script at all.
  await seedTokens(page);
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });

  const readableFromJs = await page.evaluate(() => ({
    access: localStorage.getItem("interviewai_access_token"),
    refresh: localStorage.getItem("interviewai_refresh_token"),
  }));
  expect(readableFromJs.access).toBe("expired.jwt.token");
  expect(readableFromJs.refresh).toBe("some-refresh-token");
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.toLowerCase().includes("token"))).toBe(false);
});

test("RGA019-1: clearAuth() (triggered by a failed refresh) also clears the cached user profile", async ({ page }) => {
  await seedTokensOnce(page);
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) })
  );
  await page.route("**/api/auth/refresh-token", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Invalid refresh token" }) })
  );

  // Seed a cached profile as if a prior successful session had set it — guarded
  // the same way as seedTokensOnce, for the same reason.
  await page.addInitScript(() => {
    if (sessionStorage.getItem("__e2e_profile_seeded__")) return;
    sessionStorage.setItem("__e2e_profile_seeded__", "1");
    localStorage.setItem("interviewai_user_profile", JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com" }));
  });

  await page.goto("/hr/generate/manual");
  await page.waitForURL("**/login/**", { timeout: 10000 });
  const cachedProfile = await page.evaluate(() => localStorage.getItem("interviewai_user_profile"));
  expect(cachedProfile).toBeNull();
});

test("RGA020-1: a successful refresh rotates the refresh token to the server's new value", async ({ page }) => {
  await seedTokens(page);
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  let usersMeCalls = 0;
  await page.route("**/api/users/me", (route) => {
    usersMeCalls++;
    if (usersMeCalls === 1) {
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) });
    }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }) });
  });
  await page.route("**/api/auth/refresh-token", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessToken: "rotated-access-token", refreshToken: "rotated-refresh-token" }) })
  );

  const retriedCall = page.waitForResponse((res) => res.url().includes("/api/users/me") && res.status() === 200, { timeout: 10000 });
  await page.goto("/hr/generate/manual");
  await retriedCall;

  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem("interviewai_access_token"),
    refresh: localStorage.getItem("interviewai_refresh_token"),
  }));
  expect(tokens.access).toBe("rotated-access-token");
  expect(tokens.refresh).toBe("rotated-refresh-token"); // the OLD refresh token ("some-refresh-token") is gone
});

test("RGA007-1: two concurrent 401s (different endpoints) share a single de-duped refresh call", async ({ page }) => {
  // refreshAccessToken() reuses one in-flight Promise (refreshInFlight) so that
  // simultaneous 401s from independent requests don't each fire their own
  // refresh-token call.
  await seedTokens(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  let usersMeFirstCall = true;
  await page.route("**/api/users/me", (route) => {
    if (usersMeFirstCall) {
      usersMeFirstCall = false;
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fullName: "Nguyen Van QA", email: "qa.hr@example.com", role: "HR_MANAGER" }),
    });
  });
  let subscriptionFirstCall = true;
  await page.route("**/api/me/subscription", (route) => {
    if (subscriptionFirstCall) {
      subscriptionFirstCall = false;
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) });
    }
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  let refreshCallCount = 0;
  await page.route("**/api/auth/refresh-token", (route) => {
    refreshCallCount++;
    // Small delay so both 401s land while the first refresh is still in flight.
    setTimeout(() => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accessToken: "new.jwt.token", refreshToken: "new-refresh-token" }),
      });
    }, 200);
  });

  await page.goto("/hr/generate/manual");
  await expect(page.getByRole("heading", { name: "Create questions manually" })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500); // let both retried calls settle
  expect(refreshCallCount).toBe(1);
  expect(page.url()).toContain("/hr/generate/manual"); // both requests recovered, no redirect
});

test("RGA012-1: the session expiring mid-poll (during plan generation) redirects to /login instead of retry-looping forever", async ({ page }) => {
  // generate-form.tsx's pollJob() catches its own errors and just schedules
  // another 5s poll — but getGenerationJob() internally swallows the axios
  // error into a plain `return null`, meaning the auth interceptor's own 401
  // handling (refresh -> retry -> or clearAuth+redirect) is what actually
  // fires first, upstream of pollJob's try/catch. If refresh fails, the
  // interceptor's own redirect must win over pollJob silently rescheduling.
  await seedTokensOnce(page);
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.addInitScript(() => {
    localStorage.setItem("hr_gen_job", "job-expiring");
    localStorage.setItem("hr_gen_view", "polling");
    localStorage.setItem("hr_gen_polling_phase", "plan");
  });
  await page.route("**/api/hr/question-generation-jobs/job-expiring", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) })
  );
  await page.route("**/api/auth/refresh-token", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Invalid refresh token" }) })
  );

  await page.goto("/hr/generate");
  await page.waitForURL("**/login/**", { timeout: 10000 });
  expect(page.url()).toContain("/login");
  const accessToken = await page.evaluate(() => localStorage.getItem("interviewai_access_token"));
  expect(accessToken).toBeNull();
});
