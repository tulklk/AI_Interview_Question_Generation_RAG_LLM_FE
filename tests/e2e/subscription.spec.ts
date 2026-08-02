import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * Regression tests for two real bugs found and fixed during the Aug 2026
 * subscription rewrite:
 *
 * 1. Clicking "Upgrade to Premium" on the HR billing page used to call a
 *    sandbox-style function that just created an abandoned SePay payment
 *    order and immediately reported success — the account never actually
 *    became Premium. Fixed by wiring the real create-order + poll-for-PAID
 *    flow. This test asserts the button does NOT silently flip the plan.
 *
 * 2. Free-tier HR accounts were fully blocked from generating (hard "no AI
 *    plan" gate) instead of only being subject to the real 24h cooldown.
 *    This test asserts the Generate page never shows that hard block.
 *
 * Requires TEST_HR_EMAIL / TEST_HR_PASSWORD env vars pointing at a real
 * HR_FREE test account on the target backend. Skips itself if unset so it
 * never fails a run (CI or local) that doesn't have the secrets.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.hiregen.io.vn";
const EMAIL = process.env.TEST_HR_EMAIL;
const PASSWORD = process.env.TEST_HR_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "TEST_HR_EMAIL / TEST_HR_PASSWORD not set — skipping live backend tests");

async function loginUi(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL!);
  await page.fill('input[type="password"]', PASSWORD!);
  // The submit button has a shimmer animation Playwright's actionability
  // check treats as "not stable" — force is required, not a workaround for
  // a bug.
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/hr/, { timeout: 15000 });
}

async function getAccessToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.data.accessToken as string;
}

async function getPlanCode(request: APIRequestContext, token: string): Promise<string> {
  const res = await request.get(`${API_BASE}/api/me/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.data.planCode as string;
}

test("HR billing: clicking Upgrade to Premium does not silently mark the account Premium", async ({
  page,
  request,
}) => {
  const token = await getAccessToken(request);
  const planBefore = await getPlanCode(request, token);
  test.skip(planBefore !== "HR_FREE", "Test account is not on HR_FREE — skipping to avoid mutating a paid account");

  await loginUi(page);
  await page.goto("/hr/settings?tab=billing", { waitUntil: "networkidle" });

  const upgradeBtn = page.getByRole("button", { name: /Upgrade to Premium/i });
  await upgradeBtn.first().click();

  // A real payment order must appear (order code + pending status) — the
  // regression this guards against is a toast claiming success with no
  // such order and the plan silently (and incorrectly) left unchanged.
  await expect(page.getByText(/Order code|Mã đơn/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/PENDING/i)).toBeVisible();

  // The account must still be Free — only a confirmed webhook payment
  // (never triggered in this test) is allowed to change that.
  const planAfter = await getPlanCode(request, token);
  expect(planAfter).toBe("HR_FREE");
});

test("HR generate page never hard-blocks Free-tier accounts from generating", async ({ page, request }) => {
  const token = await getAccessToken(request);
  const planBefore = await getPlanCode(request, token);
  test.skip(planBefore !== "HR_FREE", "Test account is not on HR_FREE — skipping");

  await loginUi(page);
  await page.goto("/hr/generate", { waitUntil: "networkidle" });

  // The old bug rendered a permanent "AI generation is not included on your
  // plan" banner for every Free account, regardless of cooldown state.
  await expect(page.getByText(/not included on|chưa bao gồm/i)).toHaveCount(0);
});
