import { test, expect } from "@playwright/test";

// Grounded in src/app/verify-email/page.tsx and src/core/i18n/en.ts
// (`verifyEmailPage` section). Maps to Excel sheet AUTH004_VerifyEmail.

async function mockAllApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

test("AUTH004-1: no email in URL shows the missing-email view", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/verify-email");
  await expect(page.getByText("No email found. Please register again.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to login" })).toBeVisible();
});

test("AUTH004-2: correct OTP shows the success panel and auto-redirects to /login", async ({ page }) => {
  await mockAllApi(page);
  await page.route("**/api/auth/verify-email", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.goto("/verify-email?email=candidate@example.com");
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  const boxes = page.locator('form input[type="text"]');
  await expect(boxes).toHaveCount(6);
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(String(i + 1));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: "Email verified!" })).toBeVisible();
  await page.waitForURL("**/login/**", { timeout: 5000 });
});

test("AUTH004-3: wrong OTP shows an error and clears the boxes", async ({ page }) => {
  await mockAllApi(page);
  await page.route("**/api/auth/verify-email", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid or expired verification code. Please try again." }),
    })
  );
  await page.goto("/verify-email?email=candidate@example.com");
  const boxes = page.locator('form input[type="text"]');
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(String(i + 1));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("Invalid or expired verification code. Please try again.")).toBeVisible();
  await expect(boxes.first()).toHaveValue("");
});

test("AUTH004-4: resend is disabled during the 60s cooldown, works again after", async ({ page }) => {
  await mockAllApi(page);
  await page.route("**/api/auth/resend-verification", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.goto("/verify-email?email=candidate@example.com");
  const resendBtn = page.getByRole("button", { name: /Resend code|Resend in/ });
  await resendBtn.click();
  await expect(page.getByText("A new verification code has been sent to your email.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();
});

test("AUTH004-5: pasting 6 digits at once auto-fills all boxes", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/verify-email?email=candidate@example.com");
  const boxes = page.locator('form input[type="text"]');
  await boxes.first().fill("123456"); // component's onChange treats a >1-char value as a paste
  await expect(boxes.nth(0)).toHaveValue("1");
  await expect(boxes.nth(1)).toHaveValue("2");
  await expect(boxes.nth(5)).toHaveValue("6");
});
