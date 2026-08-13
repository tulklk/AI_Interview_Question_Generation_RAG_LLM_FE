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
