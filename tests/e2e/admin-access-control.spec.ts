import { test, expect, type Page } from "@playwright/test";

// Grounded in src/features/admin/components/guards/admin-route-guard.tsx and
// src/features/admin/utils/admin-user-display.ts (isAdminRole = role.toUpperCase()
// .includes("ADMIN")). Maps to Excel sheet AUTH006_AccessControl.
// Guarded route used here: /admin/plans (one of the 4 pages that actually wire
// up AdminRouteGuard).

async function mockAllApi(page: Page) {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

async function mockSession(page: Page, role: string | null) {
  await page.addInitScript((r) => {
    if (r) {
      localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
      localStorage.setItem("interviewai_auth", "true");
      localStorage.setItem("interviewai_user_role", r);
    }
  }, role);
  await mockAllApi(page);
  if (role) {
    await page.route("**/api/users/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ fullName: "Test User", email: "test@example.com", role }),
      })
    );
  }
}

test("AUTH006-1: unauthenticated user is redirected to /login", async ({ page }) => {
  await mockSession(page, null); // no tokens set at all
  await page.goto("/admin/plans");
  await page.waitForURL("**/login/**", { timeout: 5000 });
  expect(page.url()).toContain("/login");
});

test("AUTH006-2: HR role is denied with a toast and redirected to /hr/dashboard", async ({ page }) => {
  await mockSession(page, "HR_MANAGER");
  await page.goto("/admin/plans");
  await expect(page.getByText("You do not have permission to access this page.")).toBeVisible();
  await page.waitForURL("**/hr/dashboard/**", { timeout: 5000 });
  expect(page.url()).toContain("/hr/dashboard");
});

test("AUTH006-3: Jobseeker role is denied with a toast and redirected to /jobseeker", async ({ page }) => {
  await mockSession(page, "JOB_SEEKER");
  await page.goto("/admin/plans");
  await expect(page.getByText("You do not have permission to access this page.")).toBeVisible();
  await page.waitForURL("**/jobseeker/**", { timeout: 5000 });
  expect(page.url()).toContain("/jobseeker");
});

test("AUTH006-4: Admin role renders the guarded page normally", async ({ page }) => {
  await mockSession(page, "ADMIN");
  await page.goto("/admin/plans");
  await page.waitForTimeout(1000);
  // Should stay on the admin page, not be redirected away.
  expect(page.url()).toContain("/admin/plans");
  await expect(page.getByText("You do not have permission to access this page.")).not.toBeVisible();
});

test("AUTH006-5: an UNGUARDED admin page (e.g. /admin/dashboard) has no access check at all", async ({ page }) => {
  // Known gap: AdminRouteGuard is only wired into 4 of the admin pages
  // (ai-config, companies, plans, users) — /admin/dashboard has no guard.
  await mockSession(page, "JOB_SEEKER");
  await page.goto("/admin/dashboard");
  await page.waitForTimeout(1000);
  // A non-admin is NOT redirected away from this specific page, unlike the guarded ones.
  expect(page.url()).toContain("/admin/dashboard");
});
