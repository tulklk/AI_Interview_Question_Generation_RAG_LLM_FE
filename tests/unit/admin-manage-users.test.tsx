import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import UserManagementPage from "@/app/admin/users/page";

// Grounded in src/app/admin/users/page.tsx, src/features/admin/services/
// admin-users.service.ts, src/features/admin/components/users/*, and
// src/core/i18n/en.ts (`adminPages.users`). Maps to Excel sheet
// AUTH008_ManageUsers. Unit-test rewrite of admin-manage-users.spec.ts:
// AdminRouteGuard/AdminAppShell are stubbed to pass-through (already covered
// by admin-access-control.test.tsx); mocks the admin-users.service module
// boundary instead of network routes, so filter/pagination params are
// asserted directly on the mock's call args rather than parsed from a URL.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/admin/components/guards/admin-route-guard", () => ({
  AdminRouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/services/admin-users.service", () => ({
  listUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUserStatus: vi.fn(),
}));

import { listUsers, getUserById, updateUserStatus } from "@/features/admin/services/admin-users.service";

const USER_A = {
  id: "u1", fullName: "Nguyen Van A", email: "a@example.com", role: "HR_MANAGER", roleKey: "HR_MANAGER" as const,
  isActive: true, isPremium: false, planCode: "FREE", createdAt: "2026-01-01T00:00:00Z",
};
const USER_B = {
  id: "u2", fullName: "Tran Thi B", email: "b@example.com", role: "JOB_SEEKER", roleKey: "JOB_SEEKER" as const,
  isActive: false, isPremium: true, planCode: "PREMIUM", createdAt: "2026-01-02T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(listUsers).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(updateUserStatus).mockReset();
});

describe("AUTH008 — Admin manage users", () => {
  test("AUTH008-1: search filters the visible list", async () => {
    vi.mocked(listUsers).mockImplementation(async (params) => {
      const items = params.search === "Nguyen" ? [USER_A] : [USER_A, USER_B];
      return { items, totalCount: items.length, page: params.page, pageSize: params.pageSize };
    });
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(await screen.findByText("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByText("Tran Thi B")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by name or email..."), "Nguyen");
    await waitFor(() => expect(screen.queryByText("Tran Thi B")).not.toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
  });

  test("AUTH008-2: Clear filters restores the full list", async () => {
    vi.mocked(listUsers).mockResolvedValue({ items: [USER_A, USER_B], totalCount: 2, page: 1, pageSize: 10 });
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText("Nguyen Van A")).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText("Search by name or email...");
    await user.type(searchInput, "Nguyen");

    const clearBtn = await screen.findByRole("button", { name: "Clear filters" });
    await user.click(clearBtn);
    expect(searchInput).toHaveValue("");
  });

  test("AUTH008-3: deactivating a user shows a confirm dialog, then a success toast", async () => {
    vi.mocked(listUsers).mockResolvedValue({ items: [USER_A], totalCount: 1, page: 1, pageSize: 10 });
    vi.mocked(getUserById).mockResolvedValue(USER_A);
    vi.mocked(updateUserStatus).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    await user.click(await screen.findByText("Nguyen Van A"));
    expect(await screen.findByText("User Details")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Disable account" })[0]);
    expect(
      await screen.findByText("Disable this account? The user will not be able to sign in.")
    ).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: "Disable account" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText("Account status updated.")).toBeInTheDocument();
    expect(updateUserStatus).toHaveBeenCalledWith("u1", false);
  });

  test("AUTH008-4: reactivating a suspended user shows the reactivate confirm dialog", async () => {
    vi.mocked(listUsers).mockResolvedValue({ items: [USER_B], totalCount: 1, page: 1, pageSize: 10 });
    vi.mocked(getUserById).mockResolvedValue(USER_B);
    vi.mocked(updateUserStatus).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    await user.click(await screen.findByText("Tran Thi B"));
    expect(await screen.findByText("User Details")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Reactivate account" })[0]);
    expect(
      await screen.findByText("Reactivate this account? The user will be able to sign in again.")
    ).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: "Reactivate account" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText("Account status updated.")).toBeInTheDocument();
    expect(updateUserStatus).toHaveBeenCalledWith("u2", true);
  });

  test("AUTH008-5: list load failure shows an error with a working Retry", async () => {
    vi.mocked(listUsers).mockRejectedValueOnce(new Error("500"));
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText("Failed to load users. Please try again.")).toBeInTheDocument();

    vi.mocked(listUsers).mockResolvedValueOnce({ items: [USER_A], totalCount: 1, page: 1, pageSize: 10 });
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Nguyen Van A")).toBeInTheDocument();
  });

  test("AUTH008-6: numbered pagination renders page buttons and navigates on click", async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      ...USER_A, id: `u${i + 1}`, fullName: `User ${i + 1}`, email: `user${i + 1}@example.com`,
    }));
    let lastRequestedPage = 1;
    vi.mocked(listUsers).mockImplementation(async (params) => {
      lastRequestedPage = params.page;
      const start = (params.page - 1) * 10;
      return { items: items.slice(start, start + 10), totalCount: items.length, page: params.page, pageSize: 10 };
    });
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.queryByText("…")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
    expect(lastRequestedPage).toBe(3);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
  });

  test("AUTH008-7: ellipsis separators appear once total pages exceeds 7", async () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      ...USER_A, id: `u${i + 1}`, fullName: `User ${i + 1}`, email: `user${i + 1}@example.com`,
    }));
    vi.mocked(listUsers).mockImplementation(async (params) => {
      const start = (params.page - 1) * 10;
      return { items: items.slice(start, start + 10), totalCount: items.length, page: params.page, pageSize: 10 };
    });
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText("Page 1 of 10")).toBeInTheDocument();
    expect(screen.getAllByText("…")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "6" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "10" }));
    expect(await screen.findByText("Page 10 of 10")).toBeInTheDocument();
    expect(screen.getAllByText("…")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Prev/i })).toBeEnabled();
  });

  test("UI014-1: the users table wraps in its own horizontal scroll container instead of widening the page", async () => {
    // Grounded in user-table.tsx: an overflow-x-auto wrapper around a
    // min-w-205 table-fixed table is the actual CSS mechanism that makes
    // the table scroll within its own box at narrow widths instead of
    // forcing the whole page to scroll sideways. jsdom has no real layout
    // engine (scrollWidth/clientWidth are always 0), so this is unit-test
    // rewrite of ui-visual-layout-5.spec.ts's UI014-1 checks that the
    // mechanism is wired correctly rather than asserting the resulting
    // pixel measurements, which only a real browser can compute.
    vi.mocked(listUsers).mockResolvedValue({ items: [USER_A, USER_B], totalCount: 2, page: 1, pageSize: 10 });
    renderWithProviders(<UserManagementPage />);
    await screen.findByText("Nguyen Van A");

    const table = screen.getByRole("table");
    expect(table.className).toContain("min-w-205");
    expect(table.className).toContain("table-fixed");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
  });
});
