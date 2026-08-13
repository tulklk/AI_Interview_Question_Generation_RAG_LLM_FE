import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { hrDashboardServiceMockFactory, recommendationServiceMockFactory, dashboardAggregate } from "./hr-dashboard-mocks";
import { premiumSubscription, renderStudio, getMockedGetMySubscription } from "./studio-test-utils";
import { HrDashboard } from "@/features/hr/components/dashboard/hr-dashboard";

// Grounded in src/features/hr/components/dashboard/hr-dashboard.tsx and
// src/features/hr/hooks/use-hr-dashboard.ts — HR's landing page. No prior
// automated coverage existed. Renders <HrDashboard> directly (wrapped in
// HrSubscriptionProvider via studio-test-utils.tsx's renderStudio), mocking
// hr-dashboard.service / recommendation.service at the module boundary.
//
// Two gotchas this file works around:
//  1. Every numeric KPI card counts up from 0 via a real 1-second
//     framer-motion animate() (KpiValue in hr-dashboard.tsx) — a *synchronous*
//     getByText right after an unrelated findByText resolves can catch a
//     mid-animation intermediate value, so every numeric assertion here uses
//     its own awaited findByText.
//  2. The fixture's topRole ("Backend Developer") deliberately matches the
//     fixture's recentSessions[0].role too, mirroring how a real HR account
//     would show the same role in both the "Top Role" KPI and the "Recent
//     Sessions" list — so text queries for it are scoped with getAllByText
//     rather than assuming a single match.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/services/hr-dashboard.service", async () => {
  const mod = await import("./hr-dashboard-mocks");
  return mod.hrDashboardServiceMockFactory();
});
vi.mock("@/features/hr/services/recommendation.service", async () => {
  const mod = await import("./hr-dashboard-mocks");
  return mod.recommendationServiceMockFactory();
});

import * as hrDashboardApiTyped from "@/features/hr/services/hr-dashboard.service";
import * as recommendationApiTyped from "@/features/hr/services/recommendation.service";
const hrDashboardApi = hrDashboardApiTyped as unknown as ReturnType<typeof hrDashboardServiceMockFactory>;
const recommendationApi = recommendationApiTyped as unknown as ReturnType<typeof recommendationServiceMockFactory>;

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(async () => {
  hrDashboardApi.getHrDashboard.mockReset();
  recommendationApi.listRecommendations.mockReset();
  recommendationApi.listRecommendations.mockResolvedValue({ items: [], totalCount: 0 } as never);
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(premiumSubscription() as never);
});

describe("HR Dashboard — KPIs and sections", () => {
  test(
    "DASH-1: renders KPI values from the real aggregate endpoint",
    async () => {
      hrDashboardApi.getHrDashboard.mockResolvedValue(dashboardAggregate() as never);
      renderStudio(<HrDashboard />);

      expect(await findFirstText("108")).toBeInTheDocument(); // Questions Generated (largest count-up target)
      expect(await findFirstText("12")).toBeInTheDocument(); // Total Sessions
      expect(await findFirstText("9")).toBeInTheDocument(); // Completed
      expect(await findFirstText("75%")).toBeInTheDocument(); // Success Rate
      expect(await findFirstText("Backend Developer")).toBeInTheDocument(); // Top Role (string value, no animation)
    },
    15000
  );

  test(
    "DASH-2: lists a recent session with its job title and question count",
    async () => {
      hrDashboardApi.getHrDashboard.mockResolvedValue(dashboardAggregate() as never);
      renderStudio(<HrDashboard />);

      const matches = await screen.findAllByText("Backend Developer", {}, { timeout: 10000 });
      expect(matches.length).toBeGreaterThanOrEqual(2); // Top Role KPI + Recent Sessions row
      expect(await findFirstText("15")).toBeInTheDocument(); // that session's question count
    },
    15000
  );

  test(
    "DASH-3: lists a top candidate recommendation with name, role, and score",
    async () => {
      hrDashboardApi.getHrDashboard.mockResolvedValue(dashboardAggregate() as never);
      renderStudio(<HrDashboard />);

      expect(await findFirstText("Nguyen Van A")).toBeInTheDocument();
      expect(await findFirstText("88%")).toBeInTheDocument();
    },
    15000
  );

  test(
    "DASH-4: no recommendations yet shows the empty state instead of an empty table",
    async () => {
      hrDashboardApi.getHrDashboard.mockResolvedValue(dashboardAggregate({ topRecommendations: [] }) as never);
      renderStudio(<HrDashboard />);

      await findFirstText("15"); // dashboard finished loading real data
      expect(await findFirstText("No candidate recommendations yet.")).toBeInTheDocument();
    },
    15000
  );

  test(
    "DASH-5: a load failure shows the error banner with Retry, and Retry re-fetches",
    async () => {
      hrDashboardApi.getHrDashboard.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderStudio(<HrDashboard />);

      const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
      hrDashboardApi.getHrDashboard.mockResolvedValue(dashboardAggregate() as never);
      await user.click(retryBtn);

      expect(await findFirstText("15")).toBeInTheDocument();
      expect(screen.queryByText("Failed to load dashboard data.")).not.toBeInTheDocument();
    },
    15000
  );

  test(
    "DASH-6 (finding): when the aggregate endpoint returns null (soft-fallback path), the dashboard falls back to recommendations only but still reports itself as errored",
    async () => {
      // use-hr-dashboard.ts's own fallback branch: agg === null -> fetch
      // recommendations only, then explicitly setError(true) even though the
      // fallback fetch succeeded — so the error banner shows despite candidate
      // data being present.
      hrDashboardApi.getHrDashboard.mockResolvedValue(null as never);
      recommendationApi.listRecommendations.mockResolvedValue({
        items: [{ id: "rec-1", candidateUserId: "u1", candidateName: "Fallback Candidate", candidateEmail: "f@example.com", targetRole: "QA Engineer", techStack: [], score: 70, questionSetId: "", questionSetTitle: "", completedAt: null, status: "PENDING", invitationResponseMessage: null, invitationSharedPhoneNumber: null }],
        totalCount: 1,
      } as never);
      renderStudio(<HrDashboard />);

      expect(await findFirstText("Failed to load dashboard data.")).toBeInTheDocument();
      expect(await findFirstText("Fallback Candidate")).toBeInTheDocument();
    },
    15000
  );
});
