import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, fireEvent } from "@testing-library/react";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  draftPlan,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { StudioPage } from "@/features/studio/components/studio-page";

// Grounded in src/features/studio/components/sources-panel.tsx (RagStatusChip
// and the `locked` overlay driven by studio-page.tsx's sideColumnsLocked =
// isGeneratingQuestions || questions.length > 0). Maps to Excel sheets RAG003
// (KnowledgeDocumentIngestionStatus), RAG004 (SourcesPanelLockOnGenerate),
// RAG001 (JdInputPasteValidation), and RAG002 (JdInputUploadFileTypes).
// Unit-test rewrite of studio-sources-panel.spec.ts. RAG001/RAG002 are new
// coverage — the original workbook listed these scenarios but no Playwright
// spec (nor Vitest test) ever actually covered them.

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

describe("RAG003/RAG004/RAG034 — Studio Sources panel", () => {
  test("RAG003-1: document status chips reflect Ready/Processing/Error with correct color and icon", async () => {
    bootstrapStudio(studioApi, {
      documents: [
        { id: "d1", fileName: "handbook.pdf", fileType: "pdf", fileSize: 20480, isSelected: true, status: "Completed", ragStatus: "COMPLETED", chunkCount: 8 },
        { id: "d2", fileName: "still-going.pdf", fileType: "pdf", fileSize: 10240, isSelected: false, status: "Processing", ragStatus: "PROCESSING" },
        { id: "d3", fileName: "broke.pdf", fileType: "pdf", fileSize: 5120, isSelected: false, status: "Failed", ragStatus: "FAILED", processingError: "Unreadable PDF content" },
      ],
    });
    renderStudio(<StudioPage />);

    expect(await screen.findByText("handbook.pdf", {}, { timeout: 10000 })).toBeInTheDocument();
    const readyRow = screen.getByText("handbook.pdf").closest("label")!;
    expect(readyRow).toHaveTextContent("Ready");
    expect(readyRow.querySelector('input[type="checkbox"]')).toBeEnabled();

    const processingRow = screen.getByText("still-going.pdf").closest("label")!;
    expect(processingRow).toHaveTextContent("Processing");
    expect(processingRow.querySelector('input[type="checkbox"]')).toBeDisabled();

    const failedRow = screen.getByText("broke.pdf").closest("label")!;
    expect(failedRow).toHaveTextContent("Error");
    expect(failedRow).toHaveTextContent("Unreadable PDF content");
    expect(failedRow.querySelector('input[type="checkbox"]')).toBeDisabled();
  });

  test("RAG004-1: once questions are generated, the Sources panel locks — JD field disabled with a lock hint", async () => {
    bootstrapStudio(studioApi, {
      plan: draftPlan({ status: "Approved" }),
      hasJd: true,
      questions: [{ id: "q-1", content: "Explain REST vs GraphQL.", difficulty: "Medium", type: "Technical", orderIndex: 0, expectedAnswer: null, scoringRubric: null }],
      generationRuns: [{ id: "run-1", planId: "plan-1", status: "Completed", requestedQuestionCount: 1, generatedQuestionCount: 1, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), errorCode: null, errorMessage: null }],
    });
    renderStudio(<StudioPage />);
    expect(await screen.findByText("Explain REST vs GraphQL.", {}, { timeout: 10000 })).toBeInTheDocument();

    const jdTextarea = screen.getByPlaceholderText("Paste your job description here…");
    expect(jdTextarea).toBeDisabled();
    expect(document.querySelector("div[title='Locked — click New Set to edit Sources']")).toBeInTheDocument();
  });

  test("RAG004-2: before any questions exist, the Sources panel is fully editable (no lock overlay)", async () => {
    bootstrapStudio(studioApi, {});
    renderStudio(<StudioPage />);

    const jdTextarea = await screen.findByPlaceholderText("Paste your job description here…", {}, { timeout: 10000 });
    expect(jdTextarea).toBeEnabled();
    expect(document.querySelector("div[title='Locked — click New Set to edit Sources']")).not.toBeInTheDocument();
  });

  test("RAG034-1: uploading a brand-new document starts it at Queued/Processing — unlike attach-from-library, which starts already Completed", async () => {
    // Contrast: studio-kb-library.test.tsx's RAG031-3 attaches an ALREADY-ingested
    // KB document and it shows up "Ready" immediately. A freshly uploaded file
    // has to go through RAG ingestion first — uploadDocument() only queues it.
    bootstrapStudio(studioApi, {});
    studioApi.uploadDocument.mockResolvedValue({
      id: "d-new", fileName: "backend-handbook.pdf", fileType: "pdf", fileSize: 20480,
      isSelected: true, status: "Pending", ragStatus: "QUEUED",
    } as never);

    const user = userEvent.setup();
    renderStudio(<StudioPage />);
    expect(
      await screen.findByText("No documents. Upload or attach from KB for AI context.", {}, { timeout: 10000 })
    ).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"][accept=".pdf,.docx,.txt"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4 fake content"], "backend-handbook.pdf", { type: "application/pdf" });
    await user.upload(fileInput, file);

    expect(await screen.findByText("Uploaded — RAG ingestion queued.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(studioApi.uploadDocument).toHaveBeenCalled();
    const uploadedRow = screen.getByText("backend-handbook.pdf").closest("label")!;
    expect(uploadedRow).toHaveTextContent("Queued");
    expect(uploadedRow).not.toHaveTextContent("Ready");
  });

  describe("RAG001 — JD paste-mode validation", () => {
    test("RAG001-1: Save & Analyze is disabled until the JD textarea has real (non-whitespace) content", async () => {
      bootstrapStudio(studioApi, { hasJd: false });
      const user = userEvent.setup();
      renderStudio(<StudioPage />);

      const jdTextarea = await screen.findByPlaceholderText("Paste your job description here…", {}, { timeout: 10000 });
      const saveBtn = screen.getByRole("button", { name: "Save & Analyze" });
      expect(saveBtn).toBeDisabled();
      expect(screen.getByText("No content")).toBeInTheDocument();

      await user.type(jdTextarea, "   ");
      expect(saveBtn).toBeDisabled(); // whitespace-only still counts as empty (jdContent.trim())

      await user.type(jdTextarea, "Senior Backend Developer wanted.");
      expect(saveBtn).toBeEnabled();
      expect(screen.getByText(/words · \d+ characters/)).toBeInTheDocument();
    });

    test("RAG001-2: clearing the JD textarea back to empty disables Save & Analyze again", async () => {
      bootstrapStudio(studioApi, { hasJd: false });
      const user = userEvent.setup();
      renderStudio(<StudioPage />);

      const jdTextarea = await screen.findByPlaceholderText("Paste your job description here…", {}, { timeout: 10000 });
      await user.type(jdTextarea, "Some content");
      expect(screen.getByRole("button", { name: "Save & Analyze" })).toBeEnabled();

      await user.clear(jdTextarea);
      expect(screen.getByRole("button", { name: "Save & Analyze" })).toBeDisabled();
      expect(screen.getByText("No content")).toBeInTheDocument();
    });
  });

  describe("RAG002 — JD upload file-type handling", () => {
    test("RAG002-1: a valid PDF is forwarded to the upload service and its content/summary populate the panel", async () => {
      bootstrapStudio(studioApi, { hasJd: false });
      studioApi.uploadJobDescriptionFile.mockResolvedValue({
        content: "Senior Backend Developer JD text.", originalFileName: "jd.pdf",
        summary: { detectedRole: "Backend Developer", skills: [] },
      } as never);
      const user = userEvent.setup();
      renderStudio(<StudioPage />);
      await screen.findByPlaceholderText("Paste your job description here…", {}, { timeout: 10000 });

      await user.click(screen.getByRole("button", { name: "Upload file" }));
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"]') as HTMLInputElement;
      const file = new File(["%PDF-1.4 fake content"], "jd.pdf", { type: "application/pdf" });
      await user.upload(fileInput, file);

      expect(await screen.findByText("jd.pdf", {}, { timeout: 10000 })).toBeInTheDocument();
      expect(studioApi.uploadJobDescriptionFile).toHaveBeenCalledWith(expect.any(String), file);
    });

    test('RAG002-2 (finding): the .pdf/.docx/.txt/.jpg/.jpeg/.png restriction is only the file input\'s "accept" attribute — nothing in the app rejects a disallowed file type before forwarding it to the upload service', async () => {
      // userEvent.upload() itself respects the input's accept attribute and
      // silently no-ops for a mismatched type, so a fireEvent.change bypass
      // (exactly what a raw drag-and-drop drop event would also do — drops
      // are never filtered by `accept`) is needed to prove there's no
      // additional client-side type check backing the accept attribute.
      bootstrapStudio(studioApi, { hasJd: false });
      studioApi.uploadJobDescriptionFile.mockResolvedValue({
        content: "whatever", originalFileName: "malware.exe", summary: { detectedRole: null, skills: [] },
      } as never);
      const user = userEvent.setup();
      renderStudio(<StudioPage />);
      await screen.findByPlaceholderText("Paste your job description here…", {}, { timeout: 10000 });

      await user.click(screen.getByRole("button", { name: "Upload file" }));
      const fileInput = document.querySelector('input[type="file"][accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"]') as HTMLInputElement;
      const disallowedFile = new File(["MZ\x90\x00"], "malware.exe", { type: "application/x-msdownload" });
      fireEvent.change(fileInput, { target: { files: [disallowedFile] } });

      await vi.waitFor(() => expect(studioApi.uploadJobDescriptionFile).toHaveBeenCalledWith(expect.any(String), disallowedFile));
    });

    test(
      "RAG002-3 (regression): when the upload fails, an error toast shows and the dropzone recovers to its empty state instead of a phantom uploaded-file card",
      async () => {
        // Regression test for the P1b fix: onUploadJd used to be awaited without
        // checking its result, so handleJdFile always treated the call as a
        // success. uploadJobDescription (use-studio.ts) now returns false on
        // failure instead of throwing, and handleJdFile checks that result
        // explicitly (`if (success !== false) setJdMode("upload")`) rather than
        // assuming success from a promise that merely resolved.
        bootstrapStudio(studioApi, { hasJd: false });
        studioApi.uploadJobDescriptionFile.mockRejectedValue(new Error("network down"));
        const user = userEvent.setup();
        renderStudio(<StudioPage />);
        await screen.findByPlaceholderText("Paste your job description here…", {}, { timeout: 10000 });

        await user.click(screen.getByRole("button", { name: "Upload file" }));
        const fileInput = document.querySelector('input[type="file"][accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"]') as HTMLInputElement;
        const file = new File(["%PDF-1.4 fake content"], "jd.pdf", { type: "application/pdf" });
        await user.upload(fileInput, file);

        // extractErrorMessage() prefers a plain Error's own .message over the
        // tx.jdUploadFailed fallback, so the toast surfaces "network down"
        // itself here rather than the generic fallback copy.
        expect(await screen.findByText("network down", {}, { timeout: 10000 })).toBeInTheDocument();
        // No uploaded-file card for the failed file, and the dropzone recovered
        // out of its "Uploading & analyzing…" spinner state back to normal.
        expect(screen.queryByText("jd.pdf")).not.toBeInTheDocument();
        expect(screen.getByText("Drop or click to upload")).toBeInTheDocument();
        expect(screen.queryByText("Uploading & analyzing…")).not.toBeInTheDocument();
      },
      15000
    );
  });
});
