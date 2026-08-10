import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
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

async function bootstrap() {
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
  bootstrapStudio(studioApi as never, {
    plan: draftPlan({ status: "Approved" }),
    hasJd: true,
    settings: readySettings({ appliedPlanId: "plan-1", readiness: { hasJobDescription: true, hasSelectedDocument: false, hasAwaitingApprovalPlan: false, hasApprovedPlan: true, canGenerateQuestions: true } }),
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
    await bootstrap();
    studioApi.saveDraft.mockResolvedValue({ questionSetId: "qs-1" } as never);
    studioApi.createShareLink.mockResolvedValue({ id: "share-1", token: "tok-abc123", permission: "View" } as never);
    // userEvent.setup() lazily attaches @testing-library/user-event's own
    // clipboard stub (a getter on navigator.clipboard) the FIRST time it
    // runs in a file — which replaces whatever object a spy was attached
    // to. Call setup() (and thus let it attach its stub) BEFORE spying, or
    // the spy ends up watching an object user-event immediately discards.
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    renderStudio(<StudioPage />);
    await findActionBarButton("Generate Questions");

    // Two different toast-producing actions back-to-back — Save's button
    // self-disables (isDraftSaved) right after a successful save, so it
    // can't be re-clicked to prove stacking on its own.
    await user.click(await findActionBarButton("Save"));
    await user.click(screen.getByRole("button", { name: "Share" }));

    const toastContainer = document.querySelector<HTMLElement>("div.fixed.bottom-6.right-6")!;
    expect(await within(toastContainer).findByText("Question set saved.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await within(toastContainer).findByText("Share link created and copied to clipboard.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(toastContainer.querySelectorAll(":scope > div")).toHaveLength(2);
    expect(studioApi.saveDraft).toHaveBeenCalledTimes(1);
    expect(studioApi.createShareLink).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalled();
  });

  test("UI004-2: dismissing a toast via its close (X) button removes it immediately, before the auto-dismiss timer", async () => {
    await bootstrap();
    studioApi.saveDraft.mockResolvedValue({ questionSetId: "qs-1" } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    await findActionBarButton("Generate Questions");
    await user.click(await findActionBarButton("Save"));

    const toastContainer = document.querySelector<HTMLElement>("div.fixed.bottom-6.right-6")!;
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
