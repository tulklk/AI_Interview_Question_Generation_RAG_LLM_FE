import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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
  };
});

import * as interviewApi from "@/features/interview/services/interview.service";

beforeEach(() => {
  vi.mocked(interviewApi.getHrBookmarkedSetIds).mockResolvedValue(new Set());
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
  }, 15000);
});
