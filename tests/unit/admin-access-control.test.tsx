import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/shared/providers/language-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";

// Grounded in src/features/admin/components/guards/admin-route-guard.tsx and
// src/features/admin/utils/admin-user-display.ts (isAdminRole =
// role.toUpperCase().includes("ADMIN")). Maps to Excel sheet
// AUTH006_AccessControl. Unit-test rewrite of admin-access-control.spec.ts:
// renders AdminRouteGuard directly instead of a full guarded page, mocking
// the permissions/user-context module boundary instead of localStorage +
// network.

const replace = vi.fn();
// AdminRouteGuard's useEffect has `router` in its dependency array — a
// factory that returns a NEW object on every useRouter() call would make
// that dependency "change" every render, re-firing the effect (and its
// addToast call) forever. Return one stable object instead.
const routerMock = { push: vi.fn(), replace, prefetch: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/core/auth/permissions", () => ({
  isAuthenticated: vi.fn(),
  getUserRole: vi.fn(),
  getRoleRedirect: (role: string | null) =>
    role === "HR_MANAGER" ? "/hr/dashboard" : role === "JOB_SEEKER" ? "/candidate" : "/login",
}));

vi.mock("@/features/auth/context/user-context", () => ({
  useUser: vi.fn(),
}));

import { isAuthenticated, getUserRole } from "@/core/auth/permissions";
import { useUser } from "@/features/auth/context/user-context";

function renderGuard() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <AdminRouteGuard>
          <div>Protected admin content</div>
        </AdminRouteGuard>
        <ToastContainer />
      </ToastProvider>
    </LanguageProvider>
  );
}

beforeEach(() => {
  replace.mockClear();
  vi.mocked(isAuthenticated).mockReset();
  vi.mocked(getUserRole).mockReset();
  vi.mocked(useUser).mockReset();
});

describe("AUTH006 — Admin route access control", () => {
  test("AUTH006-1: unauthenticated user is redirected to /login", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(false);
    vi.mocked(getUserRole).mockReturnValue(null);
    vi.mocked(useUser).mockReturnValue({ user: null, loading: false, refreshUser: vi.fn(), clearUser: vi.fn() });

    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Protected admin content")).not.toBeInTheDocument();
  });

  test("AUTH006-2: HR role is denied with a toast and redirected to /hr/dashboard", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true);
    vi.mocked(getUserRole).mockReturnValue("HR_MANAGER");
    vi.mocked(useUser).mockReturnValue({
      user: { fullName: "x", email: "x", role: "HR_MANAGER" } as never,
      loading: false,
      refreshUser: vi.fn(),
      clearUser: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByText("You do not have permission to access this page.")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/hr/dashboard"));
  });

  test("AUTH006-3: Jobseeker role is denied with a toast and redirected to /candidate", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true);
    vi.mocked(getUserRole).mockReturnValue("JOB_SEEKER");
    vi.mocked(useUser).mockReturnValue({
      user: { fullName: "x", email: "x", role: "JOB_SEEKER" } as never,
      loading: false,
      refreshUser: vi.fn(),
      clearUser: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByText("You do not have permission to access this page.")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/candidate"));
  });

  test("AUTH006-4: Admin role renders the guarded page normally", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true);
    vi.mocked(getUserRole).mockReturnValue("ADMIN");
    vi.mocked(useUser).mockReturnValue({
      user: { fullName: "x", email: "x", role: "ADMIN" } as never,
      loading: false,
      refreshUser: vi.fn(),
      clearUser: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByText("Protected admin content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("You do not have permission to access this page.")).not.toBeInTheDocument();
  });
});

// AUTH006-5 ("an UNGUARDED admin page has no access check at all") isn't a
// AdminRouteGuard behavior to unit test — it's the ABSENCE of this component
// on /admin/dashboard's page tree, a routing/composition fact best verified
// by reading src/app/admin/dashboard/page.tsx rather than rendering it.
