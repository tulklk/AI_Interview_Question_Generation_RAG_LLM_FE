import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { practiceSessionServiceMockFactory, sessionDetail } from "./candidate-service-mocks";
import { FeedbackResultClient } from "@/features/candidate/components/feedback/feedback-result-client";

// Grounded in src/features/candidate/components/feedback/feedback-result-client.tsx
// — exercises the score-polling state machine c268f31 introduced/extended
// (SCORE_POLL_MAX_ATTEMPTS timeout + the P4 retryScoring() re-poll flow), which
// had zero prior automated coverage. JobseekerAppShell, FeedbackPage and
// QuestionSetFeedbackDialog are stubbed to lightweight passthroughs — this
// file's target is FeedbackResultClient's own polling/timeout/retry state,
// not those components' own rendering (each has, or doesn't need, its own
// coverage elsewhere).
//
// Note on the two poll .catch() `cancelled`/`pollCancelledRef` guards this
// session's fix added: both are only reachable when a poll's rejection lands
// AFTER the owning effect has already been cleaned up (sessionId/reloadKey
// change, or unmount) — there is no user-observable UI state to assert on in
// that situation (the component is already gone), so this file instead
// covers the surrounding poll/timeout/retry behavior end-to-end, which
// exercises the same code paths.
//
// Fake timers + RTL's findBy*/waitFor don't mix well here: React 18's
// scheduler and the component's own promise chains rely on microtask/macrotask
// ticks that vi.useFakeTimers() also intercepts, so waitFor's internal polling
// can hang indefinitely. flush() pumps vi.advanceTimersByTimeAsync(0) a few
// times to drain pending microtasks between fake-timer-controlled steps
// instead — verified empirically (a single flush leaves the component still
// on its loading spinner; it takes a few ticks for the full promise chain to
// settle).

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "session-1" }),
}));

vi.mock("@/features/candidate/components/layout/jobseeker-app-shell", () => ({
  JobseekerAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/candidate/components/feedback/feedback-page", () => ({
  FeedbackPage: ({
    scoring,
    scoringTimedOut,
    onRetryScore,
  }: {
    scoring: boolean;
    scoringTimedOut: boolean;
    onRetryScore: () => void;
  }) => (
    <div>
      <div data-testid="scoring-state">
        {scoring ? "scoring" : scoringTimedOut ? "timed-out" : "done"}
      </div>
      <button type="button" onClick={onRetryScore}>
        Retry scoring
      </button>
    </div>
  ),
}));

vi.mock("@/features/candidate/components/feedback/question-set-feedback-dialog", () => ({
  QuestionSetFeedbackDialog: () => null,
}));

vi.mock("@/features/candidate/services/practice-session.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.practiceSessionServiceMockFactory();
});

vi.mock("@/features/candidate/services/question-set.service", () => ({
  getQuestionSetById: vi.fn(),
  getMyQuestionSetFeedback: vi.fn().mockResolvedValue({}),
}));

import * as practiceApiTyped from "@/features/candidate/services/practice-session.service";
const practiceApi = practiceApiTyped as unknown as ReturnType<typeof practiceSessionServiceMockFactory>;

const SCORE_POLL_INTERVAL_MS = 3000;
const SCORE_POLL_MAX_ATTEMPTS = 8;

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

beforeEach(() => {
  Object.values(practiceApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  practiceApi.readAnswerEvaluations.mockReturnValue({});
  practiceApi.getSessionFeedback.mockResolvedValue(null as never);
  practiceApi.listCompletedSessions.mockResolvedValue({ items: [] } as never);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FeedbackResultClient — score polling", () => {
  test("FRC-1: shows scoring while overallScore is null, then flips to done once a poll returns a score", async () => {
    practiceApi.getPracticeSession
      .mockResolvedValueOnce(sessionDetail({ overallScore: null, questionSetId: null }) as never)
      .mockResolvedValueOnce(sessionDetail({ overallScore: null, questionSetId: null }) as never)
      .mockResolvedValueOnce(sessionDetail({ overallScore: 85, questionSetId: null }) as never);

    renderWithProviders(<FeedbackResultClient />);
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("scoring");

    await vi.advanceTimersByTimeAsync(SCORE_POLL_INTERVAL_MS); // 1st poll — still null
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("scoring");

    await vi.advanceTimersByTimeAsync(SCORE_POLL_INTERVAL_MS); // 2nd poll — score arrives
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("done");
    expect(practiceApi.getPracticeSession).toHaveBeenCalledTimes(3); // initial + 2 polls
  });

  test("FRC-2: after SCORE_POLL_MAX_ATTEMPTS straight nulls, scoring times out instead of polling forever", async () => {
    practiceApi.getPracticeSession.mockResolvedValue(
      sessionDetail({ overallScore: null, questionSetId: null }) as never
    );

    renderWithProviders(<FeedbackResultClient />);
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("scoring");

    for (let i = 0; i < SCORE_POLL_MAX_ATTEMPTS; i++) {
      await vi.advanceTimersByTimeAsync(SCORE_POLL_INTERVAL_MS);
      await flush();
    }
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("timed-out");
    // 1 initial load + SCORE_POLL_MAX_ATTEMPTS polls
    expect(practiceApi.getPracticeSession).toHaveBeenCalledTimes(1 + SCORE_POLL_MAX_ATTEMPTS);
  });

  test("FRC-3: clicking Retry after a timeout restarts polling and can still succeed", async () => {
    practiceApi.getPracticeSession.mockResolvedValue(
      sessionDetail({ overallScore: null, questionSetId: null }) as never
    );
    renderWithProviders(<FeedbackResultClient />);
    await flush();

    for (let i = 0; i < SCORE_POLL_MAX_ATTEMPTS; i++) {
      await vi.advanceTimersByTimeAsync(SCORE_POLL_INTERVAL_MS);
      await flush();
    }
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("timed-out");

    practiceApi.getPracticeSession.mockResolvedValue(
      sessionDetail({ overallScore: 90, questionSetId: null }) as never
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry scoring" }));
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("scoring");

    await vi.advanceTimersByTimeAsync(SCORE_POLL_INTERVAL_MS);
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("done");
  });

  test("FRC-4: a score already present on initial load skips polling entirely", async () => {
    practiceApi.getPracticeSession.mockResolvedValue(
      sessionDetail({ overallScore: 72, questionSetId: null }) as never
    );

    renderWithProviders(<FeedbackResultClient />);
    await flush();
    expect(screen.getByTestId("scoring-state")).toHaveTextContent("done");

    await vi.advanceTimersByTimeAsync(SCORE_POLL_INTERVAL_MS * 2);
    expect(practiceApi.getPracticeSession).toHaveBeenCalledTimes(1);
  });
});
