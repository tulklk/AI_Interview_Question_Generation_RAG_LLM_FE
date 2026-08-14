import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { HrReviewPageClient } from "@/app/hr/history/[id]/review-client";

// Grounded in src/features/question/components/review-questions-section.tsx
// (isLocked = publishStatus === "PUBLISHED", gating Add/Edit/Delete/Reorder)
// and src/app/hr/history/[id]/review-client.tsx (fetches the draft via
// getDraft(id), id = questionSetId post-SCRUM-391). Maps to Excel sheet
// RAG028 (published-set edit restrictions). Unit-test rewrite of
// history-published-set.spec.ts.

const QS_ID = "qs-500";

function draft(status: "DRAFT" | "PUBLISHED") {
  return {
    id: QS_ID,
    sessionId: QS_ID,
    jobTitle: "Senior Backend Developer",
    generatedAt: new Date().toISOString(),
    status,
    timeLimitMinutes: 45,
    questions: [
      { id: "dq-1", question: "Explain REST vs GraphQL.", questionType: "Technical", difficulty: "Medium" },
      { id: "dq-2", question: "What is dependency injection?", questionType: "Technical", difficulty: "Medium" },
    ],
  };
}

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: QS_ID }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/interview/services/interview.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/interview/services/interview.service")>();
  return {
    ...actual,
    getDraft: vi.fn(),
    getHrBookmarkedSetIds: vi.fn(),
    toggleHrBookmark: vi.fn(),
    renameQuestionSetTitle: vi.fn(),
    setQuestionSetTimeLimit: vi.fn(),
  };
});

import * as interviewApi from "@/features/interview/services/interview.service";

beforeEach(() => {
  vi.mocked(interviewApi.getHrBookmarkedSetIds).mockResolvedValue(new Set());
  vi.mocked(interviewApi.setQuestionSetTimeLimit).mockReset();
});

describe("RAG028 — published question set locks editing", () => {
  // ReviewQuestionsSection is loaded via next/dynamic — the first cold
  // module resolution in a run can take longer than Vitest's 5s default.
  test("RAG028-1: a PUBLISHED question set blocks Add/Edit/Delete/Reorder with a lock hint", async () => {
    vi.mocked(interviewApi.getDraft).mockResolvedValue(draft("PUBLISHED") as never);
    renderWithProviders(<HrReviewPageClient />);

    expect(await screen.findByText("Explain REST vs GraphQL.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getAllByText("Published")[0]).toBeInTheDocument();
    expect(
      screen.getByText("This set is published — unpublish it first to add, edit, delete, or reorder questions.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Question" })).not.toBeInTheDocument();

    // question-edit-card.tsx: locked=true replaces the whole per-question action
    // group (edit/move/delete) with a single non-interactive lock icon, so an
    // individual question inside a published set has no Delete control at all —
    // deleting one question of a published set is already blocked, same as
    // deleting the whole set (RAG028 also covers set-level delete elsewhere).
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();

    // Feature request: HR must still be able to edit the exam time limit on
    // an already-published set (review-questions-section.tsx:622-637) — this
    // control is intentionally exempt from the isLocked gate that blocks
    // Add/Edit/Delete/Reorder, since an in-progress candidate session's
    // expiresAt is captured server-side at start time and never re-reads the
    // set's current timeLimitMinutes, so changing it later can't affect
    // sessions already underway.
    const timeLimitChip = screen.getByRole("button", { name: /Time limit: 45 min/ });
    expect(timeLimitChip).not.toBeDisabled();
  }, 15000);

  test("RAG028-3: the time-limit chip on a PUBLISHED set opens the dialog and saves a new limit", async () => {
    vi.mocked(interviewApi.getDraft).mockResolvedValue(draft("PUBLISHED") as never);
    vi.mocked(interviewApi.setQuestionSetTimeLimit).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderWithProviders(<HrReviewPageClient />);
    await screen.findByText("Explain REST vs GraphQL.", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: /Time limit: 45 min/ }));
    expect(await screen.findByRole("dialog", { name: "Practice Time Limit" }, { timeout: 10000 })).toBeInTheDocument();

    const minutesInput = screen.getByRole("spinbutton");
    await user.clear(minutesInput);
    await user.type(minutesInput, "60");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(interviewApi.setQuestionSetTimeLimit).toHaveBeenCalledWith(QS_ID, 60));
    expect(screen.queryByRole("dialog", { name: "Practice Time Limit" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Time limit: 60 min/ })).toBeInTheDocument();
  }, 15000);

  test("RAG028-2: a DRAFT (unpublished) question set allows normal editing — no lock hint, Add Question present", async () => {
    vi.mocked(interviewApi.getDraft).mockResolvedValue(draft("DRAFT") as never);
    renderWithProviders(<HrReviewPageClient />);

    expect(await screen.findByText("Explain REST vs GraphQL.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(
      screen.queryByText("This set is published — unpublish it first to add, edit, delete, or reorder questions.")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Question" })).toBeInTheDocument();

    // Draft sets are unlocked, so each question keeps its own Delete control
    // (mirror of the RAG028-1 assertion that published sets have none). Each
    // question renders both a desktop and a mobile action bar, so 2 questions
    // yields 4 Delete-titled buttons.
    expect(screen.getAllByTitle("Delete")).toHaveLength(4);
  }, 15000);
});
