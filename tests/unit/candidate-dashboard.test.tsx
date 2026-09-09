import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { questionSetServiceMockFactory, questionSet } from "./candidate-service-mocks";
import { renderCandidate } from "./candidate-test-utils";
import { CandidateDashboard } from "@/features/candidate/components/dashboard/candidate-dashboard";
import type { CompletedSessionSummary, PracticeStats } from "@/features/candidate/services/practice-session.service";

// Grounded in src/features/candidate/components/dashboard/candidate-dashboard.tsx
// and its data hook src/features/candidate/hooks/use-candidate-dashboard.ts — the
// Candidate landing page. No prior automated coverage existed. Renders
// <CandidateDashboard> via renderCandidate, mocking only the two real service
// calls the hook itself makes (listCompletedSessions, getPracticeStats) and the
// separate recommended-sets fetch (listQuestionSets, getBookmarkedSetIds) —
// everything else (streaks, readiness, trends, skill analytics, sparklines) is
// REAL derived logic from src/features/candidate/utils/dashboard-analytics.ts,
// run against the fixture sessions below, not mocked away.
//
// Every numeric KpiCard counts up from 0 via a real 1.1s framer-motion
// animate() (useCountUp in kpi-card.tsx) — same gotcha as HR's dashboard —
// so numeric assertions use an awaited findAllByText(...)[0] and an explicit
// 15000ms per-test timeout.

vi.mock("@/features/candidate/services/practice-session.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/candidate/services/practice-session.service")>();
  return { ...actual, listCompletedSessions: vi.fn(), getPracticeStats: vi.fn() };
});

vi.mock("@/features/candidate/services/question-set.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.questionSetServiceMockFactory();
});

import * as practiceApiTyped from "@/features/candidate/services/practice-session.service";
import * as questionSetApiTyped from "@/features/candidate/services/question-set.service";

const practiceApi = practiceApiTyped as unknown as {
  listCompletedSessions: ReturnType<typeof vi.fn>;
  getPracticeStats: ReturnType<typeof vi.fn>;
};
const questionSetApi = questionSetApiTyped as unknown as ReturnType<typeof questionSetServiceMockFactory>;

// use-candidate-dashboard.ts's default KpiGrid numbers are filtered to the
// last 30 days (filterSessionsByRange, real Date.now() — not mocked here),
// so a session fixture pinned to a hardcoded past date silently ages out of
// that window and starts failing CDASH-1's "6" assertion once enough real
// time passes. Anchor it a few days before "now" instead so the fixture
// never rots.
const RECENT_COMPLETED_AT = new Date(Date.now() - 3 * 86400000).toISOString();
const RECENT_STARTED_AT = new Date(Date.now() - 3 * 86400000 - 24 * 60000).toISOString();

function session(overrides: Partial<CompletedSessionSummary> = {}): CompletedSessionSummary {
  return {
    id: "sess-1",
    questionSetId: "set-1",
    setTitle: "Backend Developer Interview",
    company: "Acme Corp",
    score: 82,
    durationMinutes: 24,
    startedAt: RECENT_STARTED_AT,
    completedAt: RECENT_COMPLETED_AT,
    ...overrides,
  };
}

function stats(overrides: Partial<PracticeStats> = {}): PracticeStats {
  return {
    totalSessions: 6,
    averageScore: 78,
    bestScore: 95,
    latestScore: 82,
    totalDurationMinutes: 140,
    ...overrides,
  };
}

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(() => {
  practiceApi.listCompletedSessions.mockReset();
  practiceApi.getPracticeStats.mockReset();
  questionSetApi.listQuestionSets.mockReset();
  questionSetApi.getBookmarkedSetIds.mockReset();
  questionSetApi.getBookmarkedSetIds.mockResolvedValue(new Set());
  questionSetApi.listQuestionSets.mockResolvedValue({ items: [], totalCount: 0 });
});

describe("Candidate Dashboard — KPIs and recent sessions", () => {
  test(
    "CDASH-1: renders the total-sessions KPI from real practice stats",
    async () => {
      // dashboard-analytics.ts's computeFilteredStats derives totalSessions/
      // averageScore purely from the listCompletedSessions items actually
      // rendered (sessions.length / average of sessions' own scores) —
      // getPracticeStats()'s response isn't consulted for these two KPIs at
      // all, so the fixture must supply 6 sessions averaging 78, not lean on
      // the (unused-here) stats() mock.
      practiceApi.listCompletedSessions.mockResolvedValue({
        items: Array.from({ length: 6 }, (_, i) => session({ id: `sess-${i + 1}`, score: 78 })),
        totalCount: 6,
      });
      practiceApi.getPracticeStats.mockResolvedValue(stats());
      renderCandidate(<CandidateDashboard />);

      expect(await findFirstText("6")).toBeInTheDocument(); // Practice Sessions KPI
      expect(await findFirstText("78%")).toBeInTheDocument(); // Average Score KPI
    },
    15000
  );

  test(
    "CDASH-2: lists a recent session with its question-set title",
    async () => {
      practiceApi.listCompletedSessions.mockResolvedValue({
        items: [session({ setTitle: "Frontend React Deep Dive" })],
        totalCount: 1,
      });
      practiceApi.getPracticeStats.mockResolvedValue(stats({ totalSessions: 1 }));
      renderCandidate(<CandidateDashboard />);

      expect(await findFirstText("Frontend React Deep Dive")).toBeInTheDocument();
    },
    15000
  );

  test(
    "CDASH-3: no sessions yet shows the empty state instead of a session list",
    async () => {
      practiceApi.listCompletedSessions.mockResolvedValue({ items: [], totalCount: 0 });
      practiceApi.getPracticeStats.mockResolvedValue(stats({ totalSessions: 0, averageScore: null }));
      renderCandidate(<CandidateDashboard />);

      expect(await findFirstText("No practice sessions yet.")).toBeInTheDocument();
    },
    15000
  );

  test(
    "CDASH-4: a load failure shows Retry, and Retry re-fetches",
    async () => {
      practiceApi.listCompletedSessions.mockRejectedValueOnce(new Error("network down"));
      practiceApi.getPracticeStats.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderCandidate(<CandidateDashboard />);

      const retryButtons = await screen.findAllByRole("button", { name: "Retry" }, { timeout: 10000 });
      practiceApi.listCompletedSessions.mockResolvedValue({ items: [session()], totalCount: 1 });
      practiceApi.getPracticeStats.mockResolvedValue(stats());
      await user.click(retryButtons[0]);

      expect(await findFirstText("Backend Developer Interview")).toBeInTheDocument();
    },
    15000
  );
});

describe("Candidate Dashboard — recommended question sets", () => {
  test(
    "CDASH-5: renders recommended sets fetched via listQuestionSets",
    async () => {
      practiceApi.listCompletedSessions.mockResolvedValue({ items: [], totalCount: 0 });
      practiceApi.getPracticeStats.mockResolvedValue(stats({ totalSessions: 0, averageScore: null }));
      questionSetApi.listQuestionSets.mockResolvedValue({
        items: [questionSet({ title: "SRE Site Reliability Track" })],
        totalCount: 1,
      });
      renderCandidate(<CandidateDashboard />);

      expect(await screen.findByText("SRE Site Reliability Track", {}, { timeout: 10000 })).toBeInTheDocument();
      expect(questionSetApi.listQuestionSets).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 3 }));
    },
    15000
  );

  test(
    "CDASH-6: a recommended-sets load failure shows its own Retry, independent of the main dashboard data",
    async () => {
      practiceApi.listCompletedSessions.mockResolvedValue({ items: [session()], totalCount: 1 });
      practiceApi.getPracticeStats.mockResolvedValue(stats());
      questionSetApi.listQuestionSets.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderCandidate(<CandidateDashboard />);

      await findFirstText("Backend Developer Interview"); // main dashboard data loaded fine
      const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
      questionSetApi.listQuestionSets.mockResolvedValue({
        items: [questionSet({ title: "SRE Site Reliability Track" })],
        totalCount: 1,
      });
      await user.click(retryBtn);

      expect(await screen.findByText("SRE Site Reliability Track", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});
