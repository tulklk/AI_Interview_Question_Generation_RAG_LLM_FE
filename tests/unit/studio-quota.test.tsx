import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionInCooldown,
  freeSubscriptionReady,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/components/studio-page.tsx (the
// quota-exceeded alertdialog block) and src/core/i18n/en.ts
// (`hrSubscription`). Maps to Excel sheet RAG010 (Studio variant).
// Unit-test rewrite of studio-quota.spec.ts: renders StudioPage directly
// (wrapped in HrSubscriptionProvider), mocking the studio.service /
// subscription.service module boundary instead of network routes.
//
// RAG020-1 ("/hr/generate now redirects to Studio") dropped here: it tested
// Next.js's own client-side router.replace() in src/app/hr/generate/page.tsx,
// a 5-line component with no Studio logic in it — not something rendering
// StudioPage in isolation can exercise.

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/studio/services/studio.service", () => studioServiceMockFactory());

// vi.mock() doesn't change the STATIC type of this import — cast once here
// instead of wrapping every call site in vi.mocked(...).
import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

beforeEach(async () => {
  push.mockClear();
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
});

async function mockSession(subscription: unknown) {
  (await getMockedGetMySubscription()).mockResolvedValue(subscription as never);
  bootstrapStudio(studioApi as never);
}

describe("RAG010 — Studio quota gate", () => {
  test("RAG010-ST-1: Free plan in cooldown shows a full-page blocking alertdialog", async () => {
    await mockSession(freeSubscriptionInCooldown());
    renderStudio(<StudioPage />);

    const dialog = await screen.findByRole("alertdialog", {}, { timeout: 10000 });
    expect(await screen.findByText("Daily generation limit reached")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Daily generation limit reached");
    expect(await screen.findByRole("button", { name: "View plans & billing" })).toBeInTheDocument();
    // "Create manually" also exists as a standalone header button outside the
    // dialog — scope to the dialog to avoid a strict-mode-style ambiguity.
    expect(within(dialog).getByRole("button", { name: "Create manually" })).toBeInTheDocument();
  });

  test("RAG010-ST-2: the blocking dialog covers the content area", async () => {
    await mockSession(freeSubscriptionInCooldown());
    renderStudio(<StudioPage />);
    expect(await screen.findByRole("alertdialog", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(document.querySelector("div.pointer-events-auto.flex.flex-1.items-center.justify-center")).toBeInTheDocument();
  });

  test('RAG010-ST-3: "Create manually" navigates to /hr/generate-question/manual', async () => {
    await mockSession(freeSubscriptionInCooldown());
    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    const dialog = await screen.findByRole("alertdialog", {}, { timeout: 10000 });
    await user.click(within(dialog).getByRole("button", { name: "Create manually" }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/hr/generate-question/manual"));
  });

  test("RAG010-ST-4: no dialog and the Studio page is fully usable when quota is not exceeded", async () => {
    await mockSession(freeSubscriptionReady());
    renderStudio(<StudioPage />);
    await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("RAG010-ST-5: the blocking dialog is suppressed while a generation run is already in flight", async () => {
    await mockSession(freeSubscriptionInCooldown());
    studioApi.listGenerationRuns.mockResolvedValue([
      {
        id: "run-1", planId: "plan-1", status: "Generating",
        requestedQuestionCount: 10, generatedQuestionCount: 3, startedAt: new Date().toISOString(),
      },
    ] as never);
    renderStudio(<StudioPage />);
    await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("RAG010-ST-6: the dialog surfaces automatically once the in-flight run completes", async () => {
    await mockSession(freeSubscriptionInCooldown());
    studioApi.listGenerationRuns.mockResolvedValue([
      {
        id: "run-1", planId: "plan-1", status: "Generating",
        requestedQuestionCount: 10, generatedQuestionCount: 7, startedAt: new Date().toISOString(),
      },
    ] as never);
    // Background poll (use-studio.ts) calls getGenerationRun(projectId, runId) every 3s.
    studioApi.getGenerationRun.mockResolvedValue({
      id: "run-1", planId: "plan-1", status: "Completed",
      requestedQuestionCount: 10, generatedQuestionCount: 10,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    } as never);

    renderStudio(<StudioPage />);
    await screen.findByRole("region", { name: "Action bar" }, { timeout: 10000 });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    const dialog = await waitFor(() => screen.getByRole("alertdialog"), { timeout: 8000 });
    expect(dialog).toHaveTextContent("Daily generation limit reached");
  });
});
