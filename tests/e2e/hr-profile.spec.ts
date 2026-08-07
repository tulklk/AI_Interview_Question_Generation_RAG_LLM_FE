import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/settings/components/profile-section.tsx,
// src/shared/components/common/avatar-upload.tsx, src/shared/utils/cloudinary.ts,
// and src/core/i18n/en.ts (`settingsPage.profile`). Maps to Excel sheet
// AUTH007_UpdateProfile. Route: /hr/settings (profile is the default tab).

const HR_USER = {
  fullName: "Nguyen Van QA",
  email: "qa.hr@example.com",
  role: "HR_MANAGER",
  avatarUrl: null,
  hrProfile: {
    fullName: "Nguyen Van QA",
    companyName: "Tech ABC",
    jobTitle: "HR Manager",
    phoneNumber: "0901234567",
    linkedInUrl: "",
    githubUrl: "",
    avatarUrl: "",
    bio: "",
  },
};

async function mockSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "HR_MANAGER");
  });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(HR_USER) })
  );
}

test.beforeEach(async ({ page }) => {
  await mockSession(page);
  await page.goto("/hr/settings");
  await expect(page.getByRole("heading", { name: "Profile Information" })).toBeVisible();
  await page.getByRole("button", { name: "Edit Profile" }).click();
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
});

test("AUTH007-1: blocks save when full name is cleared to empty", async ({ page }) => {
  await page.locator("#full-name").fill("");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Could not save profile. Please try again.")).toBeVisible();
});

test("AUTH007-2: invalid LinkedIn URL shows an inline error and disables Save", async ({ page }) => {
  await page.locator("#linkedin").fill("not-a-url");
  await page.locator("#linkedin").blur();
  await expect(page.getByText("Enter a valid URL (e.g. https://…)").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeDisabled();
});

test("AUTH007-3: valid edits save successfully", async ({ page }) => {
  await page.route("**/api/users/me/hr-profile", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.locator("#full-name").fill("Nguyen Van QA Updated");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Profile saved successfully.")).toBeVisible();
});

test("AUTH007-4: Cancel discards unsaved edits", async ({ page }) => {
  await page.locator("#full-name").fill("Some Unsaved Name");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Edit Profile" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Nguyen Van QA", { exact: true })).toBeVisible();
  await expect(page.getByText("Some Unsaved Name")).toHaveCount(0);
});

test("AUTH007-5: email field is always read-only", async ({ page }) => {
  const emailInput = page.locator("#email");
  await expect(emailInput).toBeDisabled();
  await expect(page.getByText("Email cannot be changed here")).toBeVisible();
});

test("AUTH007-6: avatar upload rejects a non-image file type", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("fake pdf content"),
  });
  await expect(page.getByText("Please choose a JPG, PNG, GIF, or WebP image.")).toBeVisible();
});

test("AUTH007-7: avatar upload rejects a file over 2MB", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "big-avatar.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(3 * 1024 * 1024), // 3MB > the 2MB limit
  });
  await expect(page.getByText("Image must be 2MB or smaller.")).toBeVisible();
});

test("AUTH007-8: a valid avatar uploads and updates the preview immediately", async ({ page }) => {
  await page.route("**/api.cloudinary.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ secure_url: "https://res.cloudinary.com/demo/image/upload/avatar123.png" }),
    })
  );
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG magic bytes
  });
  await expect(page.locator('img[src*="avatar123.png"]')).toBeVisible({ timeout: 5000 });
});
