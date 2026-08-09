import { test, expect, type Page } from "@playwright/test";

// Grounded in src/app/admin/users/page.tsx, src/features/admin/services/
// admin-users.service.ts, src/features/admin/components/users/*, and
// src/core/i18n/en.ts (`adminPages.users`). Maps to Excel sheet AUTH008_ManageUsers.

const USER_A = {
  id: "u1",
  fullName: "Nguyen Van A",
  email: "a@example.com",
  role: "HR_MANAGER",
  isActive: true,
  isPremium: false,
  planCode: "FREE",
  createdAt: "2026-01-01T00:00:00Z",
};
const USER_B = {
  id: "u2",
  fullName: "Tran Thi B",
  email: "b@example.com",
  role: "JOB_SEEKER",
  isActive: false,
  isPremium: true,
  planCode: "PREMIUM",
  createdAt: "2026-01-02T00:00:00Z",
};

async function mockSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-e2e-tests");
    localStorage.setItem("interviewai_auth", "true");
    localStorage.setItem("interviewai_user_role", "ADMIN");
  });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fullName: "Admin User", email: "admin@example.com", role: "ADMIN" }),
    })
  );
}

async function mockUserList(page: Page, items: unknown[]) {
  await page.route("**/api/users?**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items, totalCount: items.length }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockSession(page);
});

test("AUTH008-1: search filters the visible list", async ({ page }) => {
  await page.route("**/api/users?**", (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("Search");
    const items = search === "Nguyen" ? [USER_A] : [USER_A, USER_B];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items, totalCount: items.length }),
    });
  });
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByText("Nguyen Van A")).toBeVisible();
  await expect(page.getByText("Tran Thi B")).toBeVisible();

  await page.getByPlaceholder("Search by name or email...").fill("Nguyen");
  await page.waitForTimeout(500); // 300ms debounce
  await expect(page.getByText("Nguyen Van A")).toBeVisible();
  await expect(page.getByText("Tran Thi B")).toHaveCount(0);
});

test("AUTH008-2: Clear filters restores the full list", async ({ page }) => {
  await mockUserList(page, [USER_A, USER_B]);
  await page.goto("/admin/users");
  await expect(page.getByText("Nguyen Van A")).toBeVisible();

  await page.getByPlaceholder("Search by name or email...").fill("Nguyen");
  await page.waitForTimeout(500);
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByPlaceholder("Search by name or email...")).toHaveValue("");
});

test("AUTH008-3: deactivating a user shows a confirm dialog, then a success toast", async ({ page }) => {
  await mockUserList(page, [USER_A]);
  await page.route("**/api/users/u1", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER_A) });
  });
  await page.route("**/api/users/u1/status", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto("/admin/users");
  await page.getByText("Nguyen Van A").click();
  await expect(page.getByText("User Details")).toBeVisible();

  await page.getByRole("button", { name: "Disable account" }).first().click();
  await expect(
    page.getByText("Disable this account? The user will not be able to sign in.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Disable account" }).last().click();
  await expect(page.getByText("Account status updated.")).toBeVisible();
});

test("AUTH008-4: reactivating a suspended user shows the reactivate confirm dialog", async ({ page }) => {
  await mockUserList(page, [USER_B]);
  await page.route("**/api/users/u2", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER_B) });
  });
  await page.route("**/api/users/u2/status", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto("/admin/users");
  await page.getByText("Tran Thi B").click();
  await expect(page.getByText("User Details")).toBeVisible();

  await page.getByRole("button", { name: "Reactivate account" }).first().click();
  await expect(
    page.getByText("Reactivate this account? The user will be able to sign in again.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Reactivate account" }).last().click();
  await expect(page.getByText("Account status updated.")).toBeVisible();
});

test("AUTH008-6: numbered pagination renders page buttons and navigates on click", async ({ page }) => {
  // 25 items, pageSize 10 -> 3 pages: getPageRange(1, 3) returns [1,2,3], no ellipsis.
  const items = Array.from({ length: 25 }, (_, i) => ({
    ...USER_A,
    id: `u${i + 1}`,
    fullName: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));
  let lastRequestedPage = "1";
  await page.route("**/api/users?**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const url = new URL(route.request().url());
    lastRequestedPage = url.searchParams.get("Page") ?? "1";
    const pageNum = Number(lastRequestedPage);
    const start = (pageNum - 1) * 10;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: items.slice(start, start + 10), totalCount: items.length }),
    });
  });

  await page.goto("/admin/users");
  await expect(page.getByText("Page 1 of 3")).toBeVisible();

  await expect(page.getByRole("button", { name: "1", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "2", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "3", exact: true })).toBeVisible();
  // Only 3 pages total (<=7), so getPageRange short-circuits: no ellipsis rendered.
  await expect(page.getByText("…")).toHaveCount(0);

  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(page.getByText("Page 3 of 3")).toBeVisible();
  expect(lastRequestedPage).toBe("3");
  await expect(page.getByRole("button", { name: "3", exact: true })).toHaveAttribute("aria-current", "page");
});

test("AUTH008-7: ellipsis separators appear once total pages exceeds 7", async ({ page }) => {
  // 100 items, pageSize 10 -> 10 pages: getPageRange(1, 10) returns [1,2,3,4,5,"…",10].
  const items = Array.from({ length: 100 }, (_, i) => ({
    ...USER_A,
    id: `u${i + 1}`,
    fullName: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));
  await page.route("**/api/users?**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("Page") ?? "1");
    const start = (pageNum - 1) * 10;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: items.slice(start, start + 10), totalCount: items.length }),
    });
  });

  await page.goto("/admin/users");
  await expect(page.getByText("Page 1 of 10")).toBeVisible();
  // Near-start range: 1,2,3,4,5,…,10 — exactly one ellipsis separator.
  await expect(page.getByText("…")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "5", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "6", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "10", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "10", exact: true }).click();
  await expect(page.getByText("Page 10 of 10")).toBeVisible();
  // Near-end range from page 10: 1,…,6,7,8,9,10.
  await expect(page.getByText("…")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "6", exact: true })).toBeVisible();

  // Next is disabled at the last page, Prev is enabled.
  await expect(page.getByRole("button", { name: /Next/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Prev/i })).toBeEnabled();
});

test("AUTH008-5: list load failure shows an error with a working Retry", async ({ page }) => {
  let shouldFail = true;
  await page.route("**/api/users?**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    if (shouldFail) return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [USER_A], totalCount: 1 }),
    });
  });
  await page.goto("/admin/users");
  await expect(page.getByText("Failed to load users. Please try again.")).toBeVisible();

  shouldFail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Nguyen Van A")).toBeVisible();
});
