import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./test-utils";
import AdminKnowledgePage from "@/app/admin/knowledge/page";

// Grounded in src/app/admin/knowledge/page.tsx — a thin wrapper that wires
// admin-scoped knowledge.service functions into the SAME shared
// <KnowledgePageContent variant="admin"> already covered end-to-end (listing,
// upload, size/type validation, delete-confirm) by hr-knowledge.test.tsx. No
// prior automated coverage existed for the admin route specifically, so this
// file only checks the wiring: the page renders, and it fetches through the
// admin-scoped functions (getAdminKnowledgeDocs etc.), not the HR ones.

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

// The mock must expose every binding src/app/admin/knowledge/page.tsx
// imports, including the folder / document-type management functions added
// alongside the knowledge-import work.
vi.mock("@/features/knowledge/services/knowledge.service", () => ({
  getAdminKnowledgeDocs: vi.fn(),
  getAdminKnowledgeFolders: vi.fn().mockResolvedValue([]),
  uploadAdminKnowledgeDoc: vi.fn(),
  deleteAdminKnowledgeDoc: vi.fn(),
  reingestAdminKnowledgeDoc: vi.fn(),
  getAdminKnowledgeDoc: vi.fn(),
  updateAdminKnowledgeDocType: vi.fn(),
  updateAdminKnowledgeDoc: vi.fn(),
  getAdminKnowledgeChunks: vi.fn().mockResolvedValue([]),
  moveAdminKnowledgeDocs: vi.fn(),
  renameAdminKnowledgeFolder: vi.fn(),
}));

import * as knowledgeApiTyped from "@/features/knowledge/services/knowledge.service";
const knowledgeApi = knowledgeApiTyped as unknown as {
  getAdminKnowledgeDocs: ReturnType<typeof vi.fn>;
  getAdminKnowledgeFolders: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  knowledgeApi.getAdminKnowledgeDocs.mockReset();
  knowledgeApi.getAdminKnowledgeFolders.mockReset();
  knowledgeApi.getAdminKnowledgeFolders.mockResolvedValue([]);
});

describe("Admin Knowledge Documents", () => {
  // knowledge-page-content.tsx line 1148: the admin variant opens on a FOLDER
  // browser (showFolderBrowser = variant === "admin" && activeFolder === null),
  // so documents are only listed after a folder is picked — and the fetch is
  // then re-issued scoped to that folder (line 870).
  test("AKB-1: renders the admin heading, then listing a folder loads its documents via getAdminKnowledgeDocs", async () => {
    knowledgeApi.getAdminKnowledgeFolders.mockResolvedValue([{ name: "swe", count: 1 }]);
    knowledgeApi.getAdminKnowledgeDocs.mockResolvedValue([
      { id: "doc-1", fileName: "company-handbook.pdf", fileSize: 20480, status: "READY", createdAt: new Date().toISOString() },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<AdminKnowledgePage />);

    expect(await screen.findByText("Knowledge Documents", {}, { timeout: 10000 })).toBeInTheDocument();
    // "swe" appears twice: the folder row label (a <p>) and a quick-filter
    // chip (a <button>) — click the folder row to open it.
    const folderLabel = (await screen.findAllByText("swe", {}, { timeout: 10000 })).find(
      (el) => el.tagName === "P"
    )!;
    await user.click(folderLabel);

    expect(await screen.findByText("company-handbook.pdf", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(knowledgeApi.getAdminKnowledgeDocs).toHaveBeenCalledWith("swe");
  });

  test("AKB-2: no folders shows the empty folder-browser state", async () => {
    knowledgeApi.getAdminKnowledgeDocs.mockResolvedValue([]);
    knowledgeApi.getAdminKnowledgeFolders.mockResolvedValue([]);
    renderWithProviders(<AdminKnowledgePage />);

    expect(
      await screen.findByText(/No folders yet/, {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });
});
