import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { PracticeSession } from "@/features/candidate/components/practice/practice-session";
import { CandidateSubscriptionProvider } from "@/features/candidate/context/candidate-subscription-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";

// Grounded in src/features/candidate/services/practice-session.service.ts's
// ForbiddenError (thrown when the BE 403s — the practice session/question set
// belongs to a different candidate) and practice-session.tsx's startForbidden
// render branch. Maps to Excel sheet RGA016 (CandidateForbiddenErrorMessages).
// Unit-test rewrite of candidate-forbidden.spec.ts: renders PracticeSession
// directly with a fixed `set` prop (bypassing the page's own data-fetch
// wrapper), mocking the service module boundary.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/candidate/services/practice-session.service", async () => {
  const actual = await vi.importActual<typeof import("@/features/candidate/services/practice-session.service")>(
    "@/features/candidate/services/practice-session.service"
  );
  return {
    ...actual,
    startPracticeSession: vi.fn(),
    submitAnswer: vi.fn(),
    completePracticeSession: vi.fn(),
    abandonPracticeSession: vi.fn(),
    getPracticeSession: vi.fn(),
  };
});

import { startPracticeSession, ForbiddenError } from "@/features/candidate/services/practice-session.service";

const SET_ID = "qs-forbidden-1";

function questionSet(): QuestionSet {
  return {
    id: SET_ID,
    title: "Senior Backend Developer",
    company: "Acme Corp",
    companyInitials: "AC",
    companyColor: "#6c47ff",
    difficulty: "Medium",
    skills: [],
    totalQuestions: 1,
    estimatedTime: "15 min",
    questions: [
      { id: "q-1", text: "Explain REST vs GraphQL.", category: "technical", difficulty: "Medium", isLocked: false },
    ],
  };
}

function renderPractice() {
  return renderWithProviders(
    <CandidateSubscriptionProvider>
      <PracticeSession set={questionSet()} onQuestionsUnlocked={vi.fn()} />
    </CandidateSubscriptionProvider>
  );
}

beforeEach(() => {
  vi.mocked(startPracticeSession).mockReset();
});

describe("RGA016 — Candidate forbidden error handling", () => {
  test("RGA016-1: a 403 starting a session shows the friendly \"no access\" message, not a raw error", async () => {
    vi.mocked(startPracticeSession).mockRejectedValueOnce(new ForbiddenError());
    renderPractice();

    expect(
      await screen.findByText("You don't have access to practice this question set.")
    ).toBeInTheDocument();
    // No raw technical error text (status code, stack, "Request failed…") leaks to the candidate.
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toContain("403");
    expect(bodyText.toLowerCase()).not.toContain("request failed");
  });

  test("RGA016-2: a plain error falls through to the generic start-error state instead of the forbidden message", async () => {
    // Contrast case: only a ForbiddenError instance triggers the friendly
    // copy above — confirms it's keyed off the error type, not just "any
    // error while starting".
    vi.mocked(startPracticeSession).mockRejectedValueOnce(new Error("Request failed with status code 500"));
    renderPractice();

    expect(await screen.findByText("Failed to start the practice session.")).toBeInTheDocument();
    expect(
      screen.queryByText("You don't have access to practice this question set.")
    ).not.toBeInTheDocument();
  });
});
