import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  readySettings,
  draftPlan,
  question,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/components/studio-action-bar.tsx's cta
// selection logic (hasQuestions > isGeneratingQuestions > planApproved >
// isStreaming > plan > else) and chat-panel.tsx's tabs array (`{ id:
// "questions", hidden: !hasQuestions }` — there is no dedicated empty-state
// message for "no questions yet", the tab simply doesn't render at all).
// Maps to Excel sheets RAG037 (StudioApprovePlanButtonStates) and RAG039
// (StudioQuestionListEmptyStateBeforeGenerate). Unit-test rewrite of
// studio-cta-states.spec.ts.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/studio/services/studio.service", () => studioServiceMockFactory());

// vi.mock() doesn't change the STATIC type of this import — cast once here
// instead of wrapping every call site in vi.mocked(...).
import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

beforeEach(async () => {
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
});

describe("RAG037/RAG039 — Studio CTA + empty states", () => {
  test('RAG039-1 / RAG037-1: before any plan exists, status reads "Enter JD to start" and Create Plan is disabled — no Questions tab', async () => {
    bootstrapStudio(studioApi as never);
    renderStudio(<StudioPage />);

    const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    expect(await screen.findByText("Enter JD to start")).toBeInTheDocument();
    // "Create Plan" also exists as the chat panel's own CTA — scope to the
    // Action bar to avoid ambiguity (same pattern as studio-quota.test.tsx).
    expect(within(actionBar).getByRole("button", { name: "Create Plan" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Questions" })).not.toBeInTheDocument();
  });

  test('RAG037-2: an unapproved plan shows "Approve Plan" as the CTA', async () => {
    bootstrapStudio(studioApi as never, {
      plan: draftPlan({ status: "Refining" }),
      hasJd: true,
      settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: false, canGenerateQuestions: false } }),
    });
    renderStudio(<StudioPage />);

    const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    expect(await screen.findByRole("button", { name: "Approve Plan" })).toBeInTheDocument();
    expect(actionBar).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Questions" })).not.toBeInTheDocument();
  });

  test('RAG037-3 / RAG039-2: an approved plan with no questions yet shows "Generate Questions" — still no Questions tab', async () => {
    bootstrapStudio(studioApi as never, {
      plan: draftPlan({ status: "Approved" }),
      hasJd: true,
      settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
    });
    renderStudio(<StudioPage />);

    const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    const generateBtn = await screen.findByRole("button", { name: "Generate Questions" });
    expect(actionBar).toContainElement(generateBtn);
    expect(generateBtn).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Questions" })).not.toBeInTheDocument();
  });

  test('RAG037-4: once questions exist, the CTA becomes a disabled "Completed" state', async () => {
    bootstrapStudio(studioApi as never, {
      plan: draftPlan({ status: "Approved" }),
      hasJd: true,
      settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
      questions: [question("genq-1", 0, "Explain REST vs GraphQL.")],
    });
    renderStudio(<StudioPage />);

    expect(await screen.findByText("Explain REST vs GraphQL.", {}, { timeout: 10000 })).toBeInTheDocument();
    const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    const completedBtn = await within(actionBar).findByRole("button", { name: "Completed" });
    expect(completedBtn).toBeDisabled();
  });

  test("RAG030-1: a network failure on Apply to plan surfaces an error toast and the button recovers", async () => {
    // studioApi.applyPlanSettings() is called with a 30s axios timeout. A real
    // timeout has no response body, so extractErrorMessage() falls through to
    // axios's own generic message (same mechanism as RGA011-1's bare-5xx
    // finding, see error-interceptor.test.ts) — simulated directly via a
    // rejected mock shaped like a real axios timeout error.
    bootstrapStudio(studioApi as never, {
      plan: draftPlan({ status: "AwaitingApproval" }),
      hasJd: true,
      settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: true, hasApprovedPlan: false, canGenerateQuestions: false } }),
    });
    studioApi.applyPlanSettings.mockRejectedValue({
      code: "ECONNABORTED",
      message: "timeout of 30000ms exceeded",
    });

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const applyBtn = await screen.findByRole("button", { name: "Apply to plan" }, { timeout: 10000 });
    await user.click(applyBtn);

    expect(await screen.findByText("timeout of 30000ms exceeded")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Apply to plan" })).toBeEnabled();
  });
});
