import { vi } from "vitest";
import type { HrDashboardData } from "@/features/hr/services/hr-dashboard.service";

// Pure mock-factory + fixture helpers — no real-component imports (see
// candidate-service-mocks.ts for why that matters to vi.mock() factories).

export function hrDashboardServiceMockFactory() {
  return {
    getHrDashboard: vi.fn(),
  };
}

export function recommendationServiceMockFactory() {
  return {
    listRecommendations: vi.fn(),
  };
}

export function dashboardAggregate(overrides: Partial<HrDashboardData> = {}): HrDashboardData {
  return {
    kpis: {
      totalSessions: 12,
      completedSessions: 9,
      totalQuestionsGenerated: 108,
      successRate: 75,
      thisMonthSessions: 4,
      topRole: "Backend Developer",
    },
    dailyActivity: [
      { date: "08/01", sessions: 1 },
      { date: "08/02", sessions: 2 },
    ],
    questionTypeDistribution: [
      { type: "Technical", count: 60 },
      { type: "Behavioral", count: 30 },
    ],
    recentSessions: [
      { id: "sess-1", role: "Backend Developer", level: "Senior", status: "Completed", questionsCount: 15, createdAt: "2026-08-05T00:00:00Z" },
    ],
    topRecommendations: [
      { id: "rec-1", candidateName: "Nguyen Van A", candidateEmail: "a@example.com", targetRole: "Backend Developer", score: 88, status: "NEW" },
    ],
    insights: { weekOverWeekTrend: "up", weekOverWeekDelta: 12 },
    ...overrides,
  };
}
