import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test in this suite runs against the local dev server (see
 * playwright.config.ts baseURL). The app's real backend
 * (NEXT_PUBLIC_API_BASE_URL, a live Azure deployment) is never hit directly:
 * auth state is injected via localStorage and every network call the app
 * makes is intercepted and answered with response shapes copied from the
 * actual TypeScript service/type definitions in src/features/**\/services,
 * so assertions stay grounded in the real contract without touching a live
 * shared backend (creating real accounts, sending real emails, spending real
 * AI generation quota).
 */

export const CURRENT_USER = {
  id: "test-hr-user-id",
  fullName: "Nguyen Van QA",
  email: "qa.hr@example.com",
  role: "HR_MANAGER",
  avatarUrl: null,
};

// Shape mirrors MySubscription in src/features/subscription/services/subscription.service.ts
export function premiumSubscription() {
  return {
    planCode: "PREMIUM",
    planName: "Premium",
    audience: "HR",
    status: "ACTIVE",
    priceMonthly: 499000,
    currency: "VND",
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-12-31T00:00:00Z",
    lastSuccessfulGenerateAt: null as string | null,
    limits: {
      generateCooldownHours: 0,
      generateUnlimited: true,
      planRegeneratePerDraft: 5,
      canExport: true,
      askAiPerMonth: 999,
      canPublish: true,
      freeVisiblePercent: 100,
      canPersistHrRecommendation: true,
      feedbackOnlyOnVisible: false,
    },
    askAiUsed: 0,
    askAiLimit: 999,
    generateSetUsed: 0,
    entitlements: {
      canExport: true,
      canAskAi: true,
      generateUnlimited: true,
      freeVisiblePercent: 100,
      canPersistHrRecommendation: true,
    },
  };
}

export function freeSubscriptionInCooldown() {
  const sub = premiumSubscription();
  return {
    ...sub,
    planCode: "FREE",
    planName: "Free",
    lastSuccessfulGenerateAt: new Date().toISOString(),
    limits: { ...sub.limits, generateUnlimited: false, generateCooldownHours: 24 },
    entitlements: { ...sub.entitlements, generateUnlimited: false },
  };
}

// Free plan, NOT in cooldown (can still generate). Used as the default mock so
// tests that don't care about billing never trip useUpgradeWatcher's FREE->PREMIUM
// "congrats" dialog (a full-screen overlay that would otherwise swallow clicks).
export function freeSubscriptionReady() {
  const sub = premiumSubscription();
  return {
    ...sub,
    planCode: "FREE",
    planName: "Free",
    lastSuccessfulGenerateAt: null,
    limits: { ...sub.limits, generateUnlimited: false, generateCooldownHours: 24 },
    entitlements: { ...sub.entitlements, generateUnlimited: false },
  };
}

/** Injects a logged-in HR session and stubs the two calls every /hr/* page fires on mount. */
export async function mockHrSession(
  page: Page,
  opts: { subscription?: ReturnType<typeof premiumSubscription> } = {}
) {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_refresh_token", "fake-refresh-token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });

  // Catch-all first: AppShell fires several background calls beyond users/me and
  // subscription (notifications, background job status, etc.) that we don't care
  // about per-test. Registering this FIRST means the specific routes below (added
  // after) take priority for the endpoints they match — Playwright runs the
  // most-recently-registered matching handler first — while everything else gets a
  // harmless empty 200 instead of hitting the real Azure backend with a fake token
  // and 401-ing into a hard redirect to /login.
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CURRENT_USER) })
  );

  const subscription = opts.subscription ?? freeSubscriptionReady();
  await page.route("**/api/me/subscription", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(subscription) })
  );
}

/** Scopes to the toast container (src/shared/components/ui/toast-container.tsx) so
 * assertions don't collide with identical inline field-error text elsewhere on the page. */
export function toast(page: Page, text: string) {
  return page.locator("div.fixed.bottom-6.right-6").getByText(text);
}

export const test = base;
export { expect };
export type { Page };
