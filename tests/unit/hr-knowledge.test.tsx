import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { KnowledgePageContent } from "@/features/knowledge/components/knowledge-page-content";
import type { KnowledgeDocument } from "@/features/knowledge/types/knowledge";

// Grounded in src/features/knowledge/components/knowledge-page-content.tsx —
// the shared component behind BOTH the HR-scoped Knowledge Documents page
// (docs/qa "HR knowledge library") and the Admin system-wide one. No prior
// automated coverage existed. Unlike other feature components this session,
// it takes its data operations as INJECTED CALLBACK PROPS (onFetchDocs,
// onUpload, onDelete, onReingest) rather than importing a service module
// directly — so these tests pass plain vi.fn() props instead of vi.mock()ing
// a service, which is simpler and matches how src/app/hr/knowledge/page.tsx
// itself wires the real services in.

function doc(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: "doc-1",
    fileName: "handbook.pdf",
    fileSize: 20480,
    status: "READY",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function setup(overrides: Partial<Parameters<typeof KnowledgePageContent>[0]> = {}) {
  // IMPORTANT: build `props` first, then destructure the (possibly
  // overridden) functions back OUT of it for the caller to assert against —
  // returning the un-overridden local defaults here was a real bug that
  // silently asserted against a mock the component was never actually given.
  const props = {
    variant: "hr" as const,
    onFetchDocs: vi.fn().mockResolvedValue([]),
    onUpload: vi.fn(),
    onDelete: vi.fn(),
    onReingest: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProviders(<KnowledgePageContent {...props} />);
  return { ...utils, ...props };
}

describe("HR Knowledge Documents — listing", () => {
  test("KB-1: lists documents fetched via onFetchDocs, with file name and status", async () => {
    setup({ onFetchDocs: vi.fn().mockResolvedValue([doc({ fileName: "handbook.pdf", status: "READY" })]) });

    expect(await screen.findByText("handbook.pdf", {}, { timeout: 10000 })).toBeInTheDocument();
    // "Ready" appears twice — the stat-tile label at the top and this
    // document's own status badge — either is fine as an existence check.
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(2);
  });

  test("KB-2: no documents shows the empty state", async () => {
    setup({ onFetchDocs: vi.fn().mockResolvedValue([]) });

    expect(await screen.findByText("No documents yet.", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("KB-3: a Failed document shows its error message", async () => {
    setup({
      onFetchDocs: vi.fn().mockResolvedValue([
        doc({ status: "FAILED", errorMessage: "Unreadable PDF content" }),
      ]),
    });

    expect(await screen.findByText("Unreadable PDF content", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("HR Knowledge Documents — upload", () => {
  test("KB-4: uploading a valid file calls onUpload and the new document appears in the list", async () => {
    const { onUpload } = setup({
      onFetchDocs: vi.fn().mockResolvedValue([]),
      onUpload: vi.fn().mockResolvedValue(doc({ id: "doc-new", fileName: "resume-guide.pdf" })),
    });
    await screen.findByText("No documents yet.", {}, { timeout: 10000 });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "resume-guide.pdf", { type: "application/pdf" });
    const user = userEvent.setup();
    await user.upload(fileInput, file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
    expect(await screen.findByText("resume-guide.pdf", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test('KB-5 (finding): a file over the 20MB limit is rejected client-side with a toast, without ever calling onUpload — the ".pdf,.docx,.doc,.txt" restriction on the input\'s "accept" attribute is the only type gate; there is no equivalent client-side MIME/extension re-check here', async () => {
    const { onUpload } = setup({ onFetchDocs: vi.fn().mockResolvedValue([]) });
    await screen.findByText("No documents yet.", {}, { timeout: 10000 });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const oversized = new File([new Uint8Array(21 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" });
    const user = userEvent.setup();
    await user.upload(fileInput, oversized);

    expect(await screen.findByText('File "huge.pdf" exceeds 20 MB.', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });
});

describe("HR Knowledge Documents — delete", () => {
  test("KB-6: delete asks for confirmation first, then removes the row on confirm", async () => {
    const { onDelete } = setup({
      onFetchDocs: vi.fn().mockResolvedValue([doc({ fileName: "handbook.pdf" })]),
      onDelete: vi.fn().mockResolvedValue(true),
    });
    await screen.findByText("handbook.pdf", {}, { timeout: 10000 });

    const user = userEvent.setup();
    // Row actions are hidden behind an icon-only "more" (···) button with no
    // accessible name (finding: MoreHorizontal button has no aria-label) —
    // scope to the row container to find it reliably.
    const row = screen.getByText("handbook.pdf").closest("div.group") as HTMLElement;
    await user.click(within(row).getByRole("button"));
    await user.click(await screen.findByText("Xoá nguồn"));

    expect(await screen.findByText("Delete document?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("doc-1"));
    await waitFor(() => expect(screen.queryByText("handbook.pdf")).not.toBeInTheDocument());
  });
});
