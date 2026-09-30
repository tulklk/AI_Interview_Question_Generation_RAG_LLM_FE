import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  readySettings,
  draftPlan,
  readyQuestion,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/shared/providers/toast-context.tsx (unbounded toast
// stacking, AUTO_DISMISS_MS=4500, manual dismiss via a 220ms exit
// animation before the toast leaves the `toasts` array). Maps to Excel
// sheet UI004 (toasts). Unit-test rewrite of ui-visual-layout-2.spec.ts's
// UI004-1/UI004-2 (the modal-focused UI003 cases live in
// ui-upgrade-modal.test.tsx instead — they depend on the real Sidebar/AppShell
// chrome, rendered there via renderWithAppShell()).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/studio/services/studio.service", () => studioServiceMockFactory());

import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

async function bootstrap(opts: Parameters<typeof bootstrapStudio>[1] = {}) {
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
  bootstrapStudio(studioApi as never, {
    plan: draftPlan({ status: "Approved" }),
    hasJd: true,
    settings: readySettings({ appliedPlanId: "plan-1", readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
    ...opts,
  });
}

beforeEach(async () => {
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
});

async function findActionBarButton(name: string) {
  const actionBar = await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
  return within(actionBar).findByRole("button", { name });
}

describe("UI004 — toast stacking and dismissal", () => {
  test("UI004-1: multiple toasts stack (no cap, no dedup) instead of replacing each other", async () => {
    // Save is hidden until questions exist, and Publish needs
    // MIN_QUESTIONS_TO_PUBLISH ready questions — bootstrap with 10 so both
    // action-bar buttons are available as two distinct toast-producing actions.
    const initialQuestions = Array.from({ length: 10 }, (_, i) => readyQuestion(`q-${i}`, i, `Question ${i + 1}.`));
    const completedRun = {
      id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: 10, generatedQuestionCount: 10,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null,
    };
    await bootstrap({ generationRuns: [completedRun], questions: initialQuestions });
    studioApi.saveDraft.mockResolvedValue({ questionSetId: "qs-1" } as never);
    studioApi.publishProject.mockResolvedValue(undefined as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);

    // Two different toast-producing actions back-to-back — Save's button
    // self-disables (isDraftSaved) right after a successful save, so it
    // can't be re-clicked to prove stacking on its own.
    await user.click(await findActionBarButton("Save"));
    await user.click(await findActionBarButton("Publish"));
    const dialog = await screen.findByRole("dialog", {}, { timeout: 10000 });
    await user.click(within(dialog).getByRole("button", { name: /^Publish \d+ questions?$/ }));

    const toastContainer = document.querySelector<HTMLElement>("div.fixed.bottom-6.right-6")!;
    expect(await within(toastContainer).findByText("Question set saved.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await within(toastContainer).findByText("Question set published.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(toastContainer.querySelectorAll(":scope > div")).toHaveLength(2);
    expect(studioApi.saveDraft).toHaveBeenCalledTimes(1);
    expect(studioApi.publishProject).toHaveBeenCalledTimes(1);
  }, 20000);

  test("UI004-2: dismissing a toast via its close (X) button removes it immediately, before the auto-dismiss timer", async () => {
    await bootstrap({ questions: [readyQuestion("q-0", 0, "Question 1.")] });
    studioApi.saveDraft.mockResolvedValue({ questionSetId: "qs-1" } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    await user.click(await findActionBarButton("Save"));

    // The container only mounts once the first toast exists, which is a tick after the click.
    const toastContainer = await vi.waitFor(() => {
      const el = document.querySelector<HTMLElement>("div.fixed.bottom-6.right-6");
      if (!el) throw new Error("toast container not mounted yet");
      return el;
    }, { timeout: 10000 });
    const firstToast = await within(toastContainer).findByText("Question set saved.", {}, { timeout: 10000 });
    const toastRow = firstToast.closest("div.pointer-events-auto")!;

    await user.click(within(toastRow as HTMLElement).getByRole("button"));

    // removeToast() flips `exiting` (triggering the CSS exit animation) and
    // only removes the item from state after EXIT_ANIMATION_MS — a
    // synchronous check right after the click would still see it mid-exit.
    await vi.waitFor(
      () => expect(document.querySelectorAll("div.fixed.bottom-6.right-6 > div")).toHaveLength(0),
      { timeout: 2000 }
    );
  });
});
