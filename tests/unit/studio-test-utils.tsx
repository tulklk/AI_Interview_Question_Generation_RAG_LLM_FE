import { vi } from "vitest";
import type { ReactElement } from "react";
import { HrSubscriptionProvider } from "@/features/hr/context/hr-subscription-context";
import { renderWithProviders } from "./test-utils";

// Shared bootstrap helpers for the Studio test suite (studio-quota,
// studio-flow, studio-cta-states, studio-chat-refine, studio-kb-library,
// studio-sample-jd, studio-sources-panel). Mirrors tests/e2e/fixtures.ts's
// mockStudioBootstrap()/premiumSubscription() pattern, but mocks the
// studio.service / subscription.service MODULE boundary (import * as
// studioApi from "...") instead of network routes — use-studio.ts calls
// these directly.
//
// vi.mock() calls must live in each *.test.tsx file (Vitest hoists them
// per-file and they can't be re-exported from a helper module), but the
// factories below can be imported and reused verbatim in every file's own
// vi.mock() call.

export const PROJECT_ID = "proj-1";

export function studioServiceMockFactory() {
  return {
    createProject: vi.fn(),
    listProjects: vi.fn(),
    getProject: vi.fn(),
    updateProject: vi.fn(),
    saveDraft: vi.fn(),
    upsertJobDescription: vi.fn(),
    analyzeJobDescription: vi.fn(),
    getJobDescription: vi.fn(),
    uploadJobDescriptionFile: vi.fn(),
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    setDocumentSelection: vi.fn(),
    reingestDocument: vi.fn(),
    deleteDocument: vi.fn(),
    listLibraryDocuments: vi.fn(),
    attachLibraryDocuments: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    applyPlanSettings: vi.fn(),
    generatePlan: vi.fn(),
    listPlans: vi.fn(),
    getCurrentPlan: vi.fn(),
    getPlanDetail: vi.fn(),
    submitPlanForApproval: vi.fn(),
    refinePlan: vi.fn(),
    approvePlan: vi.fn(),
    renamePlanTitle: vi.fn(),
    rejectPlan: vi.fn(),
    getPlanHistory: vi.fn(),
    getChatSession: vi.fn(),
    getChatMessages: vi.fn(),
    generateQuestions: vi.fn(),
    getGenerationRun: vi.fn(),
    listQuestions: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    uploadQuestionImage: vi.fn(),
    deleteQuestionImage: vi.fn(),
    regenerateQuestion: vi.fn(),
    listGenerationRuns: vi.fn(),
    publishProject: vi.fn(),
    unpublishProject: vi.fn(),
    createShareLink: vi.fn(),
  };
}

export function premiumSubscription() {
  return {
    planCode: "PREMIUM",
    planName: "Premium",
    audience: "HR",
    status: "ACTIVE",
    priceMonthly: 499000,
    currency: "VND",
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-12-31T00:00:00Z",
    lastSuccessfulGenerateAt: null as string | null,
    limits: {
      generateCooldownHours: 0,
      generateUnlimited: true,
      planRegeneratePerDraft: 5,
      canExport: true,
      askAiPerMonth: 999,
      canPublish: true,
      freeVisiblePercent: 100,
      canPersistHrRecommendation: true,
      feedbackOnlyOnVisible: false,
    },
    askAiUsed: 0,
    askAiLimit: 999,
    generateSetUsed: 0,
    entitlements: {
      canExport: true,
      canAskAi: true,
      generateUnlimited: true,
      freeVisiblePercent: 100,
      canPersistHrRecommendation: true,
    },
  };
}

export function freeSubscriptionInCooldown() {
  const sub = premiumSubscription();
  return {
    ...sub,
    planCode: "FREE",
    planName: "Free",
    lastSuccessfulGenerateAt: new Date().toISOString(),
    limits: { ...sub.limits, generateUnlimited: false, generateCooldownHours: 24 },
    entitlements: { ...sub.entitlements, generateUnlimited: false },
  };
}

export function freeSubscriptionReady() {
  const sub = premiumSubscription();
  return {
    ...sub,
    planCode: "FREE",
    planName: "Free",
    lastSuccessfulGenerateAt: null,
    limits: { ...sub.limits, generateUnlimited: false, generateCooldownHours: 24 },
    entitlements: { ...sub.entitlements, generateUnlimited: false },
  };
}

export function readySettings(overrides: Record<string, unknown> = {}) {
  return {
    projectId: PROJECT_ID,
    appliedPlanId: null,
    interviewLengthMinutes: 60,
    numberOfQuestions: 5,
    difficulty: "Medium",
    questionTone: "Professional",
    includeSampleAnswers: true,
    includeScoringRubric: true,
    outputFormat: "StructuredInterviewKit",
    outputLanguage: "Vietnamese",
    questionTypes: ["technical"],
    readiness: {
      hasJobDescription: false,
      hasSelectedDocument: false,
      hasAwaitingApprovalPlan: false,
      hasApprovedPlan: false,
      canGenerateQuestions: false,
    },
    ...overrides,
  };
}

export function draftPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1", projectId: PROJECT_ID, revision: 1, title: "Senior Backend Developer Interview Plan",
    status: "Refining", totalQuestions: 5, interviewLengthMinutes: 60, difficulty: "Medium",
    difficultyMix: { easy: 2, medium: 2, hard: 1 }, focusAreas: [{ name: "Backend", weight: 1, orderIndex: 0 }],
    sourcesUsed: [], estimatedSections: [], sections: [], concurrencyVersion: "v1",
    ...overrides,
  };
}

export function question(id: string, orderIndex: number, content = `Question ${orderIndex}`) {
  return {
    id, content, difficulty: "Medium", type: "Technical", orderIndex,
    expectedAnswer: null, scoringRubric: null,
  };
}

interface BootstrapOpts {
  hasJd?: boolean;
  documents?: unknown[];
  plan?: unknown; // undefined -> approvedPlan default via caller; null -> no plan
  settings?: unknown;
  questions?: unknown[];
  generationRuns?: unknown[];
  projectOverrides?: Record<string, unknown>;
}

/** Configures the mocked studio.service module's resolved values for a bootstrap() call. */
export function bootstrapStudio(
  studioApi: ReturnType<typeof studioServiceMockFactory>,
  opts: BootstrapOpts = {}
) {
  const documents = opts.documents ?? [];
  const questions = opts.questions ?? [];
  const generationRuns = opts.generationRuns ?? [];

  studioApi.listProjects.mockResolvedValue([{ id: PROJECT_ID, name: "Interview Plan Studio" }]);
  studioApi.getProject.mockResolvedValue({
    id: PROJECT_ID, ownerId: "owner-1", name: "Interview Plan Studio", description: null,
    status: "Draft", latestPlanRevision: 0, questionSetId: null, isPublished: false, questionSetStatus: null,
    ...opts.projectOverrides,
  });
  studioApi.getJobDescription.mockResolvedValue(
    opts.hasJd
      ? { content: "Some JD content here.", sourceType: "PastedText", wordCount: 4, characterCount: 24 }
      : null
  );
  studioApi.listDocuments.mockResolvedValue(documents);
  studioApi.getCurrentPlan.mockResolvedValue(opts.plan === undefined ? null : opts.plan);
  studioApi.getSettings.mockResolvedValue(opts.settings ?? readySettings());
  studioApi.getChatMessages.mockResolvedValue([]);
  studioApi.listPlans.mockResolvedValue([]);
  studioApi.listGenerationRuns.mockResolvedValue(generationRuns);
  studioApi.listQuestions.mockResolvedValue({ page: 1, pageSize: 100, total: questions.length, items: questions });
}

vi.mock("@/features/subscription/services/subscription.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/subscription/services/subscription.service")>();
  return {
    ...actual,
    getMySubscription: vi.fn(),
    listSubscriptionPlans: vi.fn().mockResolvedValue([]),
    cancelSubscriptionSandbox: vi.fn(),
    purchaseAskAiPack: vi.fn(),
  };
});

export async function getMockedGetMySubscription() {
  const mod = await import("@/features/subscription/services/subscription.service");
  return vi.mocked(mod.getMySubscription);
}

export function renderStudio(ui: ReactElement) {
  return renderWithProviders(<HrSubscriptionProvider>{ui}</HrSubscriptionProvider>);
}
