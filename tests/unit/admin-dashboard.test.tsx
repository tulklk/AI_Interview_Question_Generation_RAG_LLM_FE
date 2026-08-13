import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminDashboardPage from "@/app/admin/dashboard/page";
import type { AdminDashboardStats } from "@/features/admin/services/admin-dashboard.service";

// Grounded in src/app/admin/dashboard/page.tsx and
// src/features/admin/components/dashboard/admin-dashboard.tsx — Admin's
// landing page. No prior automated coverage existed. Renders
// <AdminDashboardPage> directly, mocking only the one real service call the
// data hook (use-admin-dashboard.ts) makes (fetchAdminDashboardStats) and
// knowledge.service's getAdminRagStatus (consumed by the embedded
// <AdminRagStatus> widget, same as admin-ai-config.test.tsx). Chart
// subcomponents (AdminUserRoleChart, AdminPlatformBarChart) render for real —
// jsdom's stubbed ResizeObserver keeps them from crashing, and no test here
// asserts on their internal SVG.
//
// NOTE: AdminKpiGrid's count-up is gated by framer-motion's useInView, which
// jsdom's stubbed (never-firing) IntersectionObserver keeps permanently
// false — per its own code (`if (!active) { setDisplay(target...); return; }`),
// that means the KPI numbers render their FINAL value immediately with no
// animation delay, unlike HR/Candidate dashboards' unconditional animate().
// So no 15000ms timeouts are needed here.

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/services/admin-dashboard.service", () => ({
  fetchAdminDashboardStats: vi.fn(),
}));

vi.mock("@/features/knowledge/services/knowledge.service", () => ({
  getAdminRagStatus: vi.fn().mockResolvedValue(null),
}));

import * as dashboardApiTyped from "@/features/admin/services/admin-dashboard.service";
const dashboardApi = dashboardApiTyped as unknown as { fetchAdminDashboardStats: ReturnType<typeof vi.fn> };

function stats(overrides: Partial<AdminDashboardStats> = {}): AdminDashboardStats {
  return {
    totalUsers: 120,
    hrManagers: 15,
    jobSeekers: 100,
    recentUsers: [
      {
        id: "u1",
        fullName: "Nguyen Van A",
        email: "a@example.com",
        role: "HR_MANAGER",
        roleKey: "HR_MANAGER",
        isActive: true,
        isPremium: false,
        planCode: "FREE",
        createdAt: "2026-01-01T00:00:00Z",
      } as never,
    ],
    companies: [],
    totalCompanies: 8,
    totalQuestionSets: 48,
    easySets: 14,
    mediumSets: 22,
    hardSets: 12,
    totalQuestions: 312,
    totalAttempts: 187,
    questionTypeCounts: { technical: 142, behavioral: 78 },
    ...overrides,
  };
}

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(() => {
  dashboardApi.fetchAdminDashboardStats.mockReset();
});

describe("Admin Dashboard — KPIs and recent users", () => {
  test("ADASH-1: renders KPI values from fetchAdminDashboardStats", async () => {
    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats());
    renderWithProviders(<AdminDashboardPage />);

    expect(await findFirstText("120")).toBeInTheDocument(); // Total Users
    expect(await findFirstText("15")).toBeInTheDocument(); // HR Managers
    expect(await findFirstText("100")).toBeInTheDocument(); // Job Seekers
    expect(await findFirstText("8")).toBeInTheDocument(); // Companies
  });

  test("ADASH-2: lists a recent user registration with name and email", async () => {
    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats());
    renderWithProviders(<AdminDashboardPage />);

    expect(await screen.findByText("Nguyen Van A", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("a@example.com")).toBeInTheDocument();
  });

  test("ADASH-3: no companies registered shows the corresponding platform alert", async () => {
    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats({ totalCompanies: 0, companies: [] }));
    renderWithProviders(<AdminDashboardPage />);

    expect(await screen.findByText("No companies registered", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("ADASH-3b: healthy data (companies + HR managers present) shows no alerts", async () => {
    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats());
    renderWithProviders(<AdminDashboardPage />);

    await findFirstText("120");
    expect(await screen.findByText("No alerts detected", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("Admin Dashboard — errors and refresh", () => {
  test("ADASH-4: a load failure shows the error banner with Retry, and Retry re-fetches", async () => {
    dashboardApi.fetchAdminDashboardStats.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<AdminDashboardPage />);

    const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats());
    await user.click(retryBtn);

    expect(await findFirstText("120")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load users. Please try again.")).not.toBeInTheDocument();
  });

  test("ADASH-5: clicking Refresh in the header re-fetches dashboard data", async () => {
    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats());
    const user = userEvent.setup();
    renderWithProviders(<AdminDashboardPage />);
    await findFirstText("120");

    dashboardApi.fetchAdminDashboardStats.mockResolvedValue(stats({ totalUsers: 200 }));
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await findFirstText("200")).toBeInTheDocument();
  });
});
