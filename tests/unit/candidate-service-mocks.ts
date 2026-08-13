import { vi } from "vitest";
import type { QuestionSet, PracticeQuestion } from "@/features/candidate/types/jobseeker";

// Pure mock-factory + fixture helpers for the Candidate test suite — kept in
// their own file with NO imports of real components/providers, so a
// vi.mock() factory can safely `await import(...)` this module without
// circularly re-importing the very service module it's mocking (that
// happened when these lived alongside candidate-test-utils.tsx's
// CandidateSubscriptionProvider import and caused vitest to hang).

export function practiceSessionServiceMockFactory() {
  return {
    startPracticeSession: vi.fn(),
    getPracticeSession: vi.fn(),
    readAnswerEvaluations: vi.fn(() => ({})),
    getSessionFeedback: vi.fn(),
    findInProgressSession: vi.fn(),
    submitAnswer: vi.fn(),
    completePracticeSession: vi.fn(),
    abandonPracticeSession: vi.fn(),
    listCompletedSessions: vi.fn(),
    getPracticeStats: vi.fn(),
    ForbiddenError: class ForbiddenError extends Error {},
  };
}

export function candidateBillingServiceMockFactory() {
  return {
    getCandidateSubscription: vi.fn(),
    getCandidateBillingUsage: vi.fn(),
    getCandidatePaymentHistory: vi.fn(),
    cancelSubscription: vi.fn(),
  };
}

export async function getMockedGetCandidateSubscription() {
  const mod = await import("@/features/candidate/services/candidate-billing.service");
  return vi.mocked(mod.getCandidateSubscription);
}

export function freeCandidateSubscription() {
  return { planType: "FREE" as const, status: "ACTIVE" as const };
}

export function question(overrides: Partial<PracticeQuestion> = {}): PracticeQuestion {
  return {
    id: overrides.id ?? "q-1",
    text: "Explain the difference between REST and GraphQL.",
    category: "Technical",
    difficulty: "Medium",
    isLocked: false,
    ...overrides,
  };
}

export function questionSet(overrides: Partial<QuestionSet> = {}): QuestionSet {
  const questions = overrides.questions ?? [
    question({ id: "q-1" }),
    question({ id: "q-2", text: "Describe a time you resolved a conflict on a team." }),
  ];
  return {
    id: "set-1",
    title: "Backend Developer Interview",
    company: "Acme Corp",
    companyInitials: "AC",
    companyColor: "bg-indigo-500",
    difficulty: "Medium",
    skills: ["Node.js", "SQL"],
    totalQuestions: questions.length,
    estimatedTime: "20 min",
    estimatedTimeMinutes: 0,
    timeLimitMinutes: null,
    questions,
    ...overrides,
  };
}

export function questionSetServiceMockFactory() {
  return {
    listQuestionSets: vi.fn(),
    getBookmarkedSetIds: vi.fn(),
    toggleBookmark: vi.fn(),
    getQuestionSetById: vi.fn(),
    NotFoundError: class NotFoundError extends Error {},
  };
}

export function adminCompanyServiceMockFactory() {
  return {
    listCompanies: vi.fn(),
    createCompany: vi.fn(),
    createCompaniesBulk: vi.fn(),
    updateCompany: vi.fn(),
    deleteCompany: vi.fn(),
  };
}

export function marketSet(overrides: Partial<QuestionSet> = {}): QuestionSet {
  return {
    id: overrides.id ?? "set-1",
    title: overrides.title ?? "Backend Developer Interview",
    company: overrides.company ?? "Acme Corp",
    companyInitials: "AC",
    companyColor: "bg-indigo-500",
    difficulty: overrides.difficulty ?? "Medium",
    skills: overrides.skills ?? ["Node.js", "SQL"],
    totalQuestions: 10,
    estimatedTime: "20 min",
    attempts: 0,
    rating: undefined,
    isPinned: false,
    isTrending: false,
    questions: [],
    ...overrides,
  };
}

export function sessionDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    questionSetId: "set-1",
    status: "IN_PROGRESS" as const,
    startedAt: new Date().toISOString(),
    completedAt: null,
    overallScore: null,
    timeLimitMinutes: null,
    expiresAt: null,
    questions: [
      { id: "q-1", order: 0, question: "Explain the difference between REST and GraphQL.", questionType: "Technical", difficulty: "Medium" as const, answerText: null },
      { id: "q-2", order: 1, question: "Describe a time you resolved a conflict on a team.", questionType: "Behavioral", difficulty: "Medium" as const, answerText: null },
    ],
    ...overrides,
  };
}
