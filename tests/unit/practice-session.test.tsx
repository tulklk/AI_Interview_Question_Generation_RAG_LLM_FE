import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import {
  practiceSessionServiceMockFactory,
  candidateBillingServiceMockFactory,
  getMockedGetCandidateSubscription,
  freeCandidateSubscription,
  questionSet,
  question,
  sessionDetail,
} from "./candidate-service-mocks";
import { renderCandidate } from "./candidate-test-utils";
import { PracticeSession } from "@/features/candidate/components/practice/practice-session";

// Grounded in src/features/candidate/components/practice/practice-session.tsx
// (the core "take a practice interview" flow — no prior automated coverage of
// any kind existed for this component before this file). Renders
// <PracticeSession> directly with a fixed `set` prop (bypassing
// PracticeSessionClient's own question-set fetch), mocking
// practice-session.service / candidate-billing.service at the module
// boundary. Maps to Excel scenario group "Practice Session".

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/candidate/services/practice-session.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.practiceSessionServiceMockFactory();
});
vi.mock("@/features/candidate/services/candidate-billing.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.candidateBillingServiceMockFactory();
});

import * as practiceApiTyped from "@/features/candidate/services/practice-session.service";
const practiceApi = practiceApiTyped as unknown as ReturnType<typeof practiceSessionServiceMockFactory>;

beforeEach(async () => {
  push.mockClear();
  Object.values(practiceApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetCandidateSubscription()).mockReset();
  (await getMockedGetCandidateSubscription()).mockResolvedValue(freeCandidateSubscription() as never);
  // submitAnswer fires implicitly (onBlur, question navigation, Finish's flush
  // loop) in almost every test — default it to a resolved promise so tests
  // that don't care about it don't crash on `.catch()` of an undefined return.
  practiceApi.submitAnswer.mockResolvedValue(undefined as never);
});

describe("Practice Session — starting the session", () => {
  test("PRACTICE-1: shows a loading spinner while the session is starting", async () => {
    practiceApi.startPracticeSession.mockImplementation(() => new Promise(() => {})); // never resolves
    renderCandidate(<PracticeSession set={questionSet()} />);
    expect(screen.getByText("Starting your practice session…")).toBeInTheDocument();
  });

  test("PRACTICE-2: once started, renders the first unanswered question with its category/difficulty badges", async () => {
    practiceApi.startPracticeSession.mockResolvedValue(sessionDetail() as never);
    renderCandidate(<PracticeSession set={questionSet()} />);

    expect(
      await screen.findByText("Explain the difference between REST and GraphQL.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  test("PRACTICE-3 (finding): starting fails with a generic error — shows Retry, and Retry re-invokes startPracticeSession", async () => {
    practiceApi.startPracticeSession.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderCandidate(<PracticeSession set={questionSet()} />);

    expect(
      await screen.findByText("Failed to start the practice session.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(practiceApi.startPracticeSession).toHaveBeenCalledTimes(1);

    practiceApi.startPracticeSession.mockResolvedValue(sessionDetail() as never);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(practiceApi.startPracticeSession).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Question 1 of 2", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("PRACTICE-4: a 403 (ForbiddenError) shows a no-access message instead of the generic start-failed message", async () => {
    practiceApi.startPracticeSession.mockRejectedValue(new practiceApi.ForbiddenError("forbidden"));
    renderCandidate(<PracticeSession set={questionSet()} />);

    expect(
      await screen.findByText("You don't have access to practice this question set.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(screen.queryByText("Failed to start the practice session.")).not.toBeInTheDocument();
  });

  test("PRACTICE-5: resuming a session with previously-submitted answers shows the Resumed badge and a welcome-back toast", async () => {
    practiceApi.startPracticeSession.mockResolvedValue(
      sessionDetail({
        questions: [
          { id: "q-1", order: 0, question: "Explain the difference between REST and GraphQL.", questionType: "Technical", difficulty: "Medium", answerText: "REST uses resources over HTTP verbs; GraphQL uses a single typed query endpoint." },
          { id: "q-2", order: 1, question: "Describe a time you resolved a conflict on a team.", questionType: "Behavioral", difficulty: "Medium", answerText: null },
        ],
      }) as never
    );
    renderCandidate(<PracticeSession set={questionSet()} />);

    // Lands on the first UNANSWERED question (q-2), not q-1.
    expect(
      await screen.findByText("Describe a time you resolved a conflict on a team.", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(screen.getByText("Resumed")).toBeInTheDocument();
    expect(await screen.findByText("Welcome back — your practice session was restored.")).toBeInTheDocument();
  });
});

describe("Practice Session — answering and finishing", () => {
  test(
    "PRACTICE-6: the Finish button only appears once every answerable question has content",
    async () => {
      practiceApi.startPracticeSession.mockResolvedValue(sessionDetail() as never);
      const user = userEvent.setup();
      renderCandidate(<PracticeSession set={questionSet()} />);
      await screen.findByText("Question 1 of 2", {}, { timeout: 10000 });

      expect(screen.queryByRole("button", { name: "Finish & Get Feedback" })).not.toBeInTheDocument();

      await user.type(
        screen.getByPlaceholderText("Type your answer here. Be specific and use concrete examples where possible..."),
        "REST models resources as URLs with HTTP verbs; GraphQL exposes one endpoint with a typed query language."
      );
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.type(
        await screen.findByPlaceholderText("Type your answer here. Be specific and use concrete examples where possible..."),
        "I mediated a disagreement between two teammates about API ownership by proposing a shared RFC process."
      );

      expect(await screen.findByRole("button", { name: "Finish & Get Feedback" })).toBeInTheDocument();
    },
    15000
  );

  test("PRACTICE-7: clicking Finish opens a review-confirmation dialog rather than submitting immediately", async () => {
    practiceApi.startPracticeSession.mockResolvedValue(
      sessionDetail({
        questions: [
          { id: "q-1", order: 0, question: "Explain the difference between REST and GraphQL.", questionType: "Technical", difficulty: "Medium", answerText: "REST vs GraphQL: resource-based vs typed query language, with different caching tradeoffs." },
        ],
      }) as never
    );
    const user = userEvent.setup();
    renderCandidate(<PracticeSession set={questionSet({ questions: [question({ id: "q-1" })] })} />);
    await screen.findByText("Question 1 of 1", {}, { timeout: 10000 });

    await user.click(await screen.findByRole("button", { name: "Finish & Get Feedback" }));

    expect(await screen.findByText("Submit this session?")).toBeInTheDocument();
    expect(practiceApi.completePracticeSession).not.toHaveBeenCalled();
  });

  test("PRACTICE-8: confirming the review dialog submits every answer, completes the session, and navigates to the result page", async () => {
    practiceApi.startPracticeSession.mockResolvedValue(
      sessionDetail({
        questions: [
          { id: "q-1", order: 0, question: "Explain the difference between REST and GraphQL.", questionType: "Technical", difficulty: "Medium", answerText: "REST vs GraphQL: resource-based vs typed query language, with different caching tradeoffs." },
        ],
      }) as never
    );
    practiceApi.submitAnswer.mockResolvedValue(undefined as never);
    practiceApi.completePracticeSession.mockResolvedValue({ overallScore: null, durationSeconds: 42, xpReward: null } as never);

    const user = userEvent.setup();
    renderCandidate(<PracticeSession set={questionSet({ questions: [question({ id: "q-1" })] })} />);
    await screen.findByText("Question 1 of 1", {}, { timeout: 10000 });

    await user.click(await screen.findByRole("button", { name: "Finish & Get Feedback" }));
    await screen.findByText("Submit this session?");
    await user.click(screen.getByRole("button", { name: "Submit & grade" }));

    await waitFor(() => expect(practiceApi.completePracticeSession).toHaveBeenCalledWith("session-1"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/candidate/practice/session-1/result"));
  });

  test("PRACTICE-9: if complete() fails but the session already reports COMPLETED server-side (BE auto-completed via its own time limit), the candidate is still routed to the result page instead of shown an error", async () => {
    practiceApi.startPracticeSession.mockResolvedValue(
      sessionDetail({
        questions: [
          { id: "q-1", order: 0, question: "Explain the difference between REST and GraphQL.", questionType: "Technical", difficulty: "Medium", answerText: "REST vs GraphQL: resource-based vs typed query language, with different caching tradeoffs." },
        ],
      }) as never
    );
    practiceApi.submitAnswer.mockResolvedValue(undefined as never);
    practiceApi.completePracticeSession.mockRejectedValue({ response: { status: 400, data: { message: "Session already completed" } } });
    practiceApi.getPracticeSession.mockResolvedValue(sessionDetail({ status: "COMPLETED" }) as never);

    const user = userEvent.setup();
    renderCandidate(<PracticeSession set={questionSet({ questions: [question({ id: "q-1" })] })} />);
    await screen.findByText("Question 1 of 1", {}, { timeout: 10000 });

    await user.click(await screen.findByRole("button", { name: "Finish & Get Feedback" }));
    await screen.findByText("Submit this session?");
    await user.click(screen.getByRole("button", { name: "Submit & grade" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/candidate/practice/session-1/result"));
    expect(screen.queryByText("Failed to finish the session. Please try again.")).not.toBeInTheDocument();
  });
});

describe("Practice Session — locked (Free-plan) questions", () => {
  test("PRACTICE-10: a locked question hides its text/answer box and shows an upgrade prompt instead", async () => {
    // A single-question, fully-locked set: the "land on first unanswered
    // UNLOCKED question" logic (goToFirstUnanswered) explicitly skips locked
    // questions, so a mixed locked/unlocked set would auto-navigate past the
    // locked one — using a single locked question guarantees it's the one shown.
    practiceApi.startPracticeSession.mockResolvedValue(
      sessionDetail({
        questions: [
          { id: "q-1", order: 0, question: "This is a premium-only question.", questionType: "Technical", difficulty: "Hard", answerText: null, isLocked: true },
        ],
      }) as never
    );
    renderCandidate(
      <PracticeSession
        set={questionSet({
          questions: [question({ id: "q-1", text: "This is a premium-only question.", isLocked: true })],
        })}
      />
    );

    // Locked question content is hidden; only the upgrade prompt shows.
    expect(await screen.findByText("Premium question — upgrade to unlock", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText("This is a premium-only question.")).not.toBeInTheDocument();
    expect(screen.getByText("You can't answer a locked question on the Free plan.")).toBeInTheDocument();
  });
});
