import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within, fireEvent } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  readySettings,
  draftPlan,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in sources-panel.tsx's JD dropzone drag-over class swap,
// chat-panel.tsx's PlanEmptyState streaming spinner, and
// studio-action-bar.tsx's isGeneratingQuestions CTA state. Maps to Excel
// sheets UI009 (dropzone), UI010 (button loading states), UI016 (loading
// spinner). Unit-test rewrite of the StudioPage-only cases from
// ui-visual-layout-4.spec.ts and ui-visual-layout-6.spec.ts — the
// AppShell/Sidebar-dependent cases in those files (mobile drawer, logo
// consistency, upgrade-modal z-index) live in ui-sidebar-drawer-and-logo.test.tsx
// and ui-upgrade-modal.test.tsx instead, via class/mechanism-level assertions.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/studio/services/studio.service", () => studioServiceMockFactory());

import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

beforeEach(async () => {
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
});

async function findActionBarButton(name: string) {
  const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
  return within(actionBar).findByRole("button", { name });
}

test("UI009-1: the JD file dropzone highlights on dragover and reverts on dragleave", async () => {
  bootstrapStudio(studioApi as never, { hasJd: false });
  const user = userEvent.setup();
  renderStudio(<StudioPage />);

  // JD mode defaults to "paste" — switch to "Upload file" to reveal the dropzone.
  await user.click(await screen.findByRole("button", { name: "Upload file" }, { timeout: 10000 }));
  expect(await screen.findByText("Drop or click to upload")).toBeInTheDocument();

  // The base state's class list always includes "hover:border-primary/50" (a
  // hover-variant, not the active border color), so check for the
  // dragging-only marker "bg-primary/5" instead.
  const dropzone = document.querySelector("div.border-2.border-dashed")!;
  expect(dropzone.className).not.toContain("bg-primary/5");

  fireEvent.dragOver(dropzone);
  expect(dropzone.className).toContain("bg-primary/5");

  fireEvent.dragLeave(dropzone);
  expect(dropzone.className).not.toContain("bg-primary/5");
});

test("UI016-1: the AI loading spinner renders with its status text while a plan is being generated", async () => {
  bootstrapStudio(studioApi as never, {
    hasJd: true,
    settings: readySettings({ readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: false, canGenerateQuestions: false } }),
  });
  const planDetail = draftPlan({
    id: "plan-1", revision: 1, title: "Senior Backend Developer Interview Plan", status: "Refining",
    totalQuestions: 5, difficultyMix: { easy: 2, medium: 2, hard: 1 },
  });

  // A too-short delay races findByText's polling interval — the streaming
  // state can resolve and clear again between polls, making the assertion
  // flaky. Hold it open long enough to reliably observe.
  let planCreated = false;
  studioApi.generatePlan.mockImplementation(async () => {
    await new Promise((r) => setTimeout(r, 500));
    planCreated = true;
    return { id: "plan-1", revision: 1 } as never;
  });
  studioApi.getPlanDetail.mockResolvedValue(planDetail as never);
  studioApi.getCurrentPlan.mockImplementation(async () => (planCreated ? (planDetail as never) : null));

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  const createBtn = await findActionBarButton("Create Plan");
  await user.click(createBtn);

  // PlanEmptyState (chat-panel.tsx): spinner + streamingTitle text render in
  // the chat panel while use-studio.ts's isStreaming is true.
  expect(await screen.findByText("Creating Interview Plan…", {}, { timeout: 10000 })).toBeInTheDocument();
  expect(document.querySelector(".ai-spin-outer")).toBeInTheDocument();
  expect(document.querySelector(".ai-spin-glow")).toBeInTheDocument();

  expect(await screen.findByText("Senior Backend Developer Interview Plan", {}, { timeout: 10000 })).toBeInTheDocument();
  expect(document.querySelector(".ai-spin-outer")).not.toBeInTheDocument();
}, 15000);

test('UI010-2: the "Generate Questions" CTA shows a disabled "Generating…" state while the request is in flight', async () => {
  bootstrapStudio(studioApi as never, {
    plan: draftPlan({ status: "Approved" }),
    hasJd: true,
    settings: readySettings({ appliedPlanId: "plan-1", readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
  });

  studioApi.generateQuestions.mockImplementation(async () => {
    await new Promise((r) => setTimeout(r, 500));
    return {
      id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    } as never;
  });
  // bootstrap() always calls listQuestions() once a plan exists — the first
  // hit must stay empty so the CTA still reads "Generate Questions" instead
  // of already-"Completed".
  let questionsCallCount = 0;
  studioApi.listQuestions.mockImplementation(async () => {
    questionsCallCount++;
    const items = questionsCallCount > 1
      ? [{ id: "genq-1", content: "x", difficulty: "Medium", type: "Technical", orderIndex: 0, expectedAnswer: null, scoringRubric: null }]
      : [];
    return { page: 1, pageSize: 100, total: items.length, items } as never;
  });

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  const generateBtn = await findActionBarButton("Generate Questions");
  await user.click(generateBtn);

  const generatingBtn = await findActionBarButton("Generating…");
  expect(generatingBtn).toBeDisabled();

  expect(await findActionBarButton("Completed")).toBeInTheDocument();
});
