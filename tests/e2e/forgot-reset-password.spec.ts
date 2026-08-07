import { test, expect } from "@playwright/test";

// Grounded in src/app/forgot-password/page.tsx, src/features/auth/components/
// reset-password-content.tsx, and src/core/i18n/en.ts (`forgotPasswordPage` /
// `resetPasswordPage`). Maps to Excel sheet AUTH005_ForgotResetPassword.

async function mockAllApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

// ── Forgot password ──────────────────────────────────────────────────────────

test("AUTH005-1: forgot-password blocks submit with empty email", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();
  // The submit button is disabled while email.trim() is empty (page.tsx:219), so a
  // whitespace-only value can never be submitted by clicking it in a real browser.
  // Submit the form directly to reach this validation branch (still runs the real
  // handleSubmit handler, same as a genuine submit would).
  const emailInput = page.getByPlaceholder("you@company.com");
  await emailInput.fill(" ");
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.getByText("Email is required.")).toBeVisible();
});

test("AUTH005-2: forgot-password rejects an invalid email format", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@company.com").fill("not-an-email");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
});

test("AUTH005-3: forgot-password shows the generic success screen for a valid email", async ({ page }) => {
  await mockAllApi(page);
  await page.route("**/api/auth/forgot-password", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@company.com").fill("someone@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(
    page.getByText("If an account exists for this email, we've sent password reset instructions.")
  ).toBeVisible();
  await expect(page.getByText("someone@example.com")).toBeVisible();
});

// ── Reset password ───────────────────────────────────────────────────────────

test("AUTH005-4: reset-password shows the token-error panel when no token is in the URL", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/reset-password");
  await expect(
    page.getByText("This reset link is invalid or has expired. Please request a new one.")
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
    "href",
    "/forgot-password/"
  );
});

test("AUTH005-5: reset-password blocks submit when the new password is under 8 characters", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/reset-password?token=valid-token-abc");
  await expect(page.getByRole("heading", { name: "Set new password" })).toBeVisible();
  await page.getByPlaceholder("Min. 8 characters").fill("Pw1!");
  await page.getByPlaceholder("Repeat your new password").fill("Pw1!");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
});

test("AUTH005-6: reset-password blocks submit on confirm-password mismatch", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/reset-password?token=valid-token-abc");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your new password").fill("Different1!");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
});

test("AUTH005-7: reset-password with an expired/invalid token (400) shows the token-error panel", async ({ page }) => {
  await mockAllApi(page);
  await page.route("**/api/auth/reset-password", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Token has expired" }),
    })
  );
  await page.goto("/reset-password?token=expired-token");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your new password").fill("Password1!");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(
    page.getByText("This reset link is invalid or has expired. Please request a new one.")
  ).toBeVisible();
});

test("AUTH005-8: reset-password valid submit redirects to /login?reset=success", async ({ page }) => {
  await mockAllApi(page);
  await page.route("**/api/auth/reset-password", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.goto("/reset-password?token=valid-token-abc");
  await page.getByPlaceholder("Min. 8 characters").fill("Password1!");
  await page.getByPlaceholder("Repeat your new password").fill("Password1!");
  await page.getByRole("button", { name: "Reset password" }).click();
  await page.waitForURL("**/login/?reset=success", { timeout: 5000 });
  // The login page reads ?reset=success and shows this toast (use-login.ts:58-64)
  await expect(page.getByText("Password reset successfully. You can sign in now.")).toBeVisible();
});
