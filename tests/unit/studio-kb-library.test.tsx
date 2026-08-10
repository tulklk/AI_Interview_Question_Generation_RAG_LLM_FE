import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/components/sources-panel.tsx's library
// picker (togglePick gates on !alreadyAttached && status === "COMPLETED") and
// src/features/studio/hooks/use-studio.ts's attachLibraryDocuments. Maps to
// Excel sheet RAG031 (KB doc library attach-vs-upload). Unit-test rewrite of
// studio-kb-library.spec.ts.

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

async function openLibraryPicker() {
  bootstrapStudio(studioApi, { hasJd: false });
  studioApi.listLibraryDocuments.mockResolvedValue([
    { knowledgeDocumentId: "kd-1", fileName: "backend-handbook.pdf", status: "COMPLETED", chunkCount: 12, createdAt: new Date().toISOString(), alreadyAttached: false },
    { knowledgeDocumentId: "kd-2", fileName: "already-in-project.pdf", status: "COMPLETED", chunkCount: 5, createdAt: new Date().toISOString(), alreadyAttached: true },
    { knowledgeDocumentId: "kd-3", fileName: "still-ingesting.pdf", status: "PROCESSING", chunkCount: 0, createdAt: new Date().toISOString(), alreadyAttached: false },
  ] as never);

  const user = userEvent.setup();
  renderStudio(<StudioPage />);
  await user.click(await screen.findByRole("button", { name: "From KB" }, { timeout: 10000 }));
  expect(await screen.findByText("Select from Knowledge Base")).toBeInTheDocument();
  return user;
}

describe("RAG031 — Studio KB library picker", () => {
  test('RAG031-1: an already-attached document shows "Attached" and cannot be re-picked', async () => {
    await openLibraryPicker();
    const row = screen.getByRole("button", { name: /already-in-project\.pdf/ });
    expect(row).toBeDisabled();
    expect(screen.getByText("Attached")).toBeInTheDocument();
  });

  test("RAG031-2: a still-processing (non-COMPLETED) document is not selectable either", async () => {
    await openLibraryPicker();
    const row = screen.getByRole("button", { name: /still-ingesting\.pdf/ });
    expect(row).toBeDisabled();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
  });

  test("RAG031-3: picking a COMPLETED, not-yet-attached doc and clicking Attach calls the attach endpoint with its id", async () => {
    const user = await openLibraryPicker();
    let attachBody: string[] | null = null;
    studioApi.attachLibraryDocuments.mockImplementation(async (_projectId, ids) => {
      attachBody = ids;
      return [{ id: "kd-1", fileName: "backend-handbook.pdf", fileType: "pdf", fileSize: 1000, isSelected: true, status: "Completed" }] as never;
    });

    const row = screen.getByRole("button", { name: /backend-handbook\.pdf/ });
    expect(row).toBeEnabled();
    await user.click(row);
    expect(await screen.findByText("Selected 1/1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Attach 1 doc(s)" }));
    expect(await screen.findByText("1 document(s) attached from Knowledge Base.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(attachBody).toEqual(["kd-1"]);
  });
});
