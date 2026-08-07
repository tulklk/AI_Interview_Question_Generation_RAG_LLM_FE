import { test, expect } from "@playwright/test";

// Grounded in src/features/auth/hooks/use-login.ts, login-form.tsx,
// utils/login-errors.ts, and src/core/i18n/en.ts (`loginPage` section).
// Maps to Excel sheet AUTH002_Login.

async function mockAllApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

test.beforeEach(async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  // The form's staggered framer-motion entrance animation moves the Sign in
  // button for a bit after mount, which makes Playwright's click "element is
  // not stable" actionability check race intermittently. Give it a beat.
  await page.waitForTimeout(1200);
});

test("AUTH002-1: empty email shows \"Email is required\"", async ({ page }) => {
  await page.getByPlaceholder("••••••••").fill("somepassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await expect(page.getByText("Email is required")).toBeVisible();
});

test("AUTH002-2: empty password shows \"Password is required\"", async ({ page }) => {
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await expect(page.getByText("Password is required")).toBeVisible();
});

test("AUTH002-3: wrong password (401) shows invalidCredentials toast", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid credentials" }),
    })
  );
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("••••••••").fill("wrongpassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await expect(page.getByText("Email or password is incorrect. Please try again.")).toBeVisible();
});

test("AUTH002-4: disabled account (403) shows accountDisabled toast", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ message: "Account is disabled" }),
    })
  );
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("••••••••").fill("correctpassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await expect(
    page.getByText("Your account has been disabled. Please contact the administrator.")
  ).toBeVisible();
});

test("AUTH002-5: unverified account opens the resend-verification dialog", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Email is not verified" }),
    })
  );
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("••••••••").fill("correctpassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Email not verified" })).toBeVisible();
  await expect(page.getByText("Resend email")).toBeVisible();
  await expect(page.getByText("Close")).toBeVisible();
});

test("AUTH002-6: valid HR credentials redirect to /hr/dashboard", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "fake-token", refreshToken: "fake-refresh", role: "HR_MANAGER" }),
    })
  );
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("••••••••").fill("correctpassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await page.waitForURL("**/hr/dashboard/**", { timeout: 5000 });
  expect(page.url()).toContain("/hr/dashboard");
});

test("AUTH002-7: valid Jobseeker credentials redirect to /jobseeker", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "fake-token", refreshToken: "fake-refresh", role: "JOB_SEEKER" }),
    })
  );
  await page.getByPlaceholder("you@company.com").fill("candidate@example.com");
  await page.getByPlaceholder("••••••••").fill("correctpassword");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });
  await page.waitForURL("**/jobseeker/**", { timeout: 5000 });
  expect(page.url()).toContain("/jobseeker");
});
