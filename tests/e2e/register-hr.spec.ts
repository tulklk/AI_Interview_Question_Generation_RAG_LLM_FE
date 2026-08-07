import { test, expect } from "@playwright/test";

// Grounded in src/features/auth/components/register-form.tsx and
// src/features/auth/hooks/use-register.ts (registerRole="hr", the default),
// plus src/core/i18n/en.ts (`registerPage` section). Maps to Excel sheet AUTH001_RegisterHR.
// Route: /register (RegisterRoleTabs defaults to the HR tab/RegisterForm).

async function mockAllApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

async function settle(page: import("@playwright/test").Page) {
  await page.waitForTimeout(1200); // let the staggered framer-motion entrance settle
}

test.beforeEach(async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await settle(page);
});

test("AUTH001-1: step 1 blocks Continue when full name is empty", async ({ page }) => {
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Full name is required")).toBeVisible();
});

test("AUTH001-2: step 1 blocks Continue when password is under 8 characters", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Nguyen Van A");
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Pw1!");
  await page.getByPlaceholder("Repeat your password").fill("Pw1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
});

test("AUTH001-3: step 1 blocks Continue when password is missing a complexity class", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Nguyen Van A");
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  // 8+ chars, but no uppercase/special char
  await page.getByPlaceholder("Min. 8 characters").fill("password1");
  await page.getByPlaceholder("Repeat your password").fill("password1");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(
    page.getByText(
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character"
    )
  ).toBeVisible();
});

test("AUTH001-4: step 1 blocks Continue on confirm-password mismatch", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Nguyen Van A");
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password2!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Passwords do not match")).toBeVisible();
});

test("AUTH001-5: step 1 valid input advances to step 2", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Nguyen Van A");
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible();
  await expect(page.getByPlaceholder("Acme Corp")).toBeVisible();
});

async function goToStep2(page: import("@playwright/test").Page) {
  await page.getByPlaceholder("John Doe").fill("Nguyen Van A");
  await page.getByPlaceholder("you@company.com").fill("hr@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible();
  await settle(page);
}

test("AUTH001-6: step 2 blocks submit when not agreed to terms", async ({ page }) => {
  await goToStep2(page);
  await page.getByPlaceholder("Acme Corp").fill("Tech ABC");
  await page.getByPlaceholder("e.g. HR Manager").fill("HR Manager");
  await page.getByRole("button", { name: "Create Account" }).click({ force: true });
  await expect(page.getByText("You must agree to the terms")).toBeVisible();
});

test("AUTH001-7: step 2 blocks submit when company name or job title is empty", async ({ page }) => {
  await goToStep2(page);
  await page.locator("button.auth-checkbox").click({ force: true }); // agree to terms
  await page.getByRole("button", { name: "Create Account" }).click({ force: true });
  await expect(page.getByText("Company name is required")).toBeVisible();
  await expect(page.getByText("Job title is required")).toBeVisible();
});

test("AUTH001-8: step 2 valid submit redirects to /verify-email", async ({ page }) => {
  await page.route("**/api/auth/register/hr", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await goToStep2(page);
  await page.getByPlaceholder("Acme Corp").fill("Tech ABC");
  await page.getByPlaceholder("e.g. HR Manager").fill("HR Manager");
  await page.locator("button.auth-checkbox").click({ force: true });
  await page.getByRole("button", { name: "Create Account" }).click({ force: true });
  await page.waitForURL("**/verify-email/?email=hr%40example.com", { timeout: 5000 });
  expect(page.url()).toContain("/verify-email");
  expect(page.url()).toContain("email=hr%40example.com");
});

test("AUTH001-9: duplicate email (409) jumps back to step 1 with an inline error", async ({ page }) => {
  await page.route("**/api/auth/register/hr", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ message: "email already exists" }),
    })
  );
  await goToStep2(page);
  await page.getByPlaceholder("Acme Corp").fill("Tech ABC");
  await page.getByPlaceholder("e.g. HR Manager").fill("HR Manager");
  await page.locator("button.auth-checkbox").click({ force: true });
  await page.getByRole("button", { name: "Create Account" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByText("This email is already registered.")).toBeVisible();
});
