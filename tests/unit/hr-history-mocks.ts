import { vi } from "vitest";
import type { HistoryQuestionSetItem } from "@/features/hr/types/history-question-set";

// Pure mock-factory + fixture helpers for the HR History test suite — no
// imports of real components/providers, so a vi.mock() factory can safely
// `await import(...)` this module without circularly re-importing a
// service module it's mocking (see candidate-service-mocks.ts for the same
// pattern and why it matters).

export function hrHistoryServiceMockFactory() {
  return {
    listHistoryQuestionSets: vi.fn(),
    exportHistoryQuestionSet: vi.fn(),
    deleteHistoryQuestionSet: vi.fn(),
  };
}

export function interviewServiceMockFactory() {
  return {
    publishQuestionSet: vi.fn(),
    unpublishQuestionSet: vi.fn(),
    toggleHrBookmark: vi.fn(),
    renameQuestionSetTitle: vi.fn(),
    // Added for SCRUM-437's PublishDialog flow: clicking "Publish to
    // marketplace" now calls getDraft() first to build the dialog's
    // question-selection list (question-set-history-table.tsx's
    // handlePublishToggle), before the dialog's own confirm button is what
    // actually calls publishQuestionSet(id, payload).
    getDraft: vi.fn(),
  };
}

// >= MIN_QUESTIONS_TO_PUBLISH (10, question-builder-set-panel.tsx) ready+active
// questions, matching PublishDialog's default-selection shape.
export function publishableDraft(questionCount = 10) {
  return {
    questionSetId: "qs-1",
    title: "Backend Developer Set",
    status: "DRAFT",
    timeLimitMinutes: null,
    autoRecommendEnabled: true,
    recommendationMinScore: 70,
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `q-${i + 1}`,
      question: `Question ${i + 1}`,
      isReady: true,
      isActive: true,
    })),
  };
}

export function historyItem(overrides: Partial<HistoryQuestionSetItem> = {}): HistoryQuestionSetItem {
  return {
    questionSetId: "qs-1",
    title: "Backend Developer Set",
    status: "DRAFT",
    questionCount: 8,
    isBookmarked: false,
    sourceProjectId: null,
    jobId: null,
    savedAt: new Date().toISOString(),
    publishedAt: null,
    ...overrides,
  };
}
