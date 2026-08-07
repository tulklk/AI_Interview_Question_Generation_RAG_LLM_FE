import { test, expect } from "@playwright/test";

// Grounded in src/features/auth/components/register-jobseeker-form.tsx and
// src/core/i18n/en.ts (`registerJobSeekerPage` section). Maps to Excel sheet
// AUTH003_RegisterJobSeeker. Route: /register/jobseeker.
// Note: step1 field-required messages ("Họ tên là bắt buộc", "Vui lòng nhập
// email hợp lệ") and step2 ones are hard-coded Vietnamese in the component
// itself, not pulled from the rp.* i18n dictionary — so they show up in
// English UI too. That's the real current behavior, not a test mistake.

async function mockAllApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

async function settle(page: import("@playwright/test").Page) {
  await page.waitForTimeout(1200);
}

test.beforeEach(async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/register/jobseeker");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await settle(page);
});

test("AUTH003-1: step 1 blocks Continue when full name is empty", async ({ page }) => {
  await page.getByPlaceholder("you@example.com").fill("candidate@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Họ tên là bắt buộc")).toBeVisible();
});

test("AUTH003-2: step 1 blocks Continue on invalid email format", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Tran Thi B");
  await page.getByPlaceholder("you@example.com").fill("not-an-email");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Vui lòng nhập email hợp lệ")).toBeVisible();
});

test("AUTH003-3: step 1 blocks Continue when password is under 8 characters", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Tran Thi B");
  await page.getByPlaceholder("you@example.com").fill("candidate@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Pw1!");
  await page.getByPlaceholder("Repeat your password").fill("Pw1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
});

test("AUTH003-4: step 1 blocks Continue when password is missing a complexity class", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Tran Thi B");
  await page.getByPlaceholder("you@example.com").fill("candidate@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("password1");
  await page.getByPlaceholder("Repeat your password").fill("password1");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(
    page.getByText(
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character"
    )
  ).toBeVisible();
});

test("AUTH003-5: step 1 blocks Continue on confirm-password mismatch", async ({ page }) => {
  await page.getByPlaceholder("John Doe").fill("Tran Thi B");
  await page.getByPlaceholder("you@example.com").fill("candidate@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Different1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByText("Passwords do not match")).toBeVisible();
});

async function goToStep2(page: import("@playwright/test").Page) {
  await page.getByPlaceholder("John Doe").fill("Tran Thi B");
  await page.getByPlaceholder("you@example.com").fill("candidate@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your password").fill("Password1!");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible();
  await settle(page);
}

test("AUTH003-6: step 1 valid input advances to step 2", async ({ page }) => {
  await goToStep2(page);
  await expect(page.getByPlaceholder("e.g. Frontend Developer")).toBeVisible();
});

test("AUTH003-7: step 2 blocks submit when target role, seniority, and tech stack are all empty", async ({ page }) => {
  await goToStep2(page);
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.getByText("Vị trí mục tiêu là bắt buộc")).toBeVisible();
  await expect(page.getByText("Vui lòng chọn cấp độ kinh nghiệm")).toBeVisible();
  await expect(page.getByText("Chọn ít nhất một công nghệ")).toBeVisible();
});

test("AUTH003-8: step 2 valid submit redirects to /verify-email", async ({ page }) => {
  await page.route("**/api/auth/register/candidate", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await goToStep2(page);
  await page.getByPlaceholder("e.g. Frontend Developer").fill("Backend Developer");
  await page.locator("select").selectOption("Junior");
  await page.getByPlaceholder("Search technologies...").click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Node.js", exact: true }).click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole("heading", { name: "Your Profile" }).click({ force: true }); // close the tech dropdown so it does not cover Create Account
  // The submit button is a framer-motion motion.button; a CDP-simulated click on
  // it doesn't reliably trigger the native form-submit-on-click behavior. Submit
  // the form directly instead — this still runs the real handleSubmit handler.
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await page.waitForURL("**/verify-email/?email=candidate%40example.com", { timeout: 5000 });
  expect(page.url()).toContain("/verify-email");
});

test("AUTH003-9: duplicate email (409) jumps back to step 1 with an inline error", async ({ page }) => {
  await page.route("**/api/auth/register/candidate", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ message: "email already registered" }),
    })
  );
  await goToStep2(page);
  await page.getByPlaceholder("e.g. Frontend Developer").fill("Backend Developer");
  await page.locator("select").selectOption("Junior");
  await page.getByPlaceholder("Search technologies...").click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Node.js", exact: true }).click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole("heading", { name: "Your Profile" }).click({ force: true }); // close the tech dropdown so it does not cover Create Account
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  // "Account Information" is just the always-visible step-indicator label, not a
  // heading — the real step-1 content heading is "Create your account".
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByText("This email is already registered.")).toBeVisible();
});
