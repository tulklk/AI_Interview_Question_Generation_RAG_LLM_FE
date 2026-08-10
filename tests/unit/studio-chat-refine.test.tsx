import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  draftPlan,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/hooks/use-studio.ts's sendMessage (calls
// studioApi.refinePlan per turn, no SSE — SCRUM-368) and
// src/features/studio/components/chat-panel.tsx's AiAssistantTab (composer
// locked once plan.status === "Approved"). Maps to Excel sheet RAG032
// (multi-turn chat refine). Unit-test rewrite of studio-chat-refine.spec.ts.

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

describe("RAG032 — Studio chat refine", () => {
  test("RAG032-1: two sequential chat refinements each call refinePlan and both messages accumulate in history", async () => {
    bootstrapStudio(studioApi, { plan: draftPlan(), hasJd: true });

    // Stateful: after each successful refine, sendMessage() calls
    // refreshStudioState() -> refreshMessages() -> getChatMessages(), which
    // OVERWRITES the locally-added optimistic bubble with whatever the
    // server says. A real backend persists the just-sent turn by then, so
    // the mock must too, or the just-sent message would visibly vanish
    // right after the "Plan refined." toast.
    const refineCalls: string[] = [];
    const serverMessages: Array<{ id: string; sessionId: string; role: string; content: string; status: string; createdAt: string }> = [];
    studioApi.refinePlan.mockImplementation(async (_projectId, _planId, instruction) => {
      refineCalls.push(instruction);
      serverMessages.push({
        id: `m-${refineCalls.length}`, sessionId: "", role: "User", content: instruction,
        status: "Completed", createdAt: new Date().toISOString(),
      });
      return { plan: draftPlan({ revision: refineCalls.length + 1 }) } as never;
    });
    studioApi.getChatMessages.mockImplementation(async () => [...serverMessages] as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    await user.click(await screen.findByRole("button", { name: "AI Assistant" }, { timeout: 10000 }));
    const composer = await screen.findByPlaceholderText("Ask AI to refine the plan…");

    await user.type(composer, "Add more system design questions.");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Plan refined.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText("Add more system design questions.")).toBeInTheDocument();

    await user.type(composer, "Make the tone more casual.");
    await user.keyboard("{Enter}");
    expect((await screen.findAllByText("Plan refined.", {}, { timeout: 10000 })).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("Make the tone more casual.")).toBeInTheDocument();

    // Both turns are still in the transcript — chat history isn't cleared between turns.
    expect(screen.getByText("Add more system design questions.")).toBeInTheDocument();
    expect(refineCalls).toEqual(["Add more system design questions.", "Make the tone more casual."]);
  });

  test("RAG032-2: once the plan is Approved, the chat composer is locked with a distinct placeholder", async () => {
    bootstrapStudio(studioApi, { plan: draftPlan({ status: "Approved" }), hasJd: true });

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    await user.click(await screen.findByRole("button", { name: "AI Assistant" }, { timeout: 10000 }));

    const composer = await screen.findByPlaceholderText("Chat locked after plan approval");
    expect(composer).toBeDisabled();
    expect(screen.queryByPlaceholderText("Ask AI to refine the plan…")).not.toBeInTheDocument();
  });
});
