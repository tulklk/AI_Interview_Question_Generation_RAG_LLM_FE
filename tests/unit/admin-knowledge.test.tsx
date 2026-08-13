import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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

vi.mock("@/features/knowledge/services/knowledge.service", () => ({
  getAdminKnowledgeDocs: vi.fn(),
  uploadAdminKnowledgeDoc: vi.fn(),
  deleteAdminKnowledgeDoc: vi.fn(),
  reingestAdminKnowledgeDoc: vi.fn(),
  getAdminKnowledgeDoc: vi.fn(),
}));

import * as knowledgeApiTyped from "@/features/knowledge/services/knowledge.service";
const knowledgeApi = knowledgeApiTyped as unknown as {
  getAdminKnowledgeDocs: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  knowledgeApi.getAdminKnowledgeDocs.mockReset();
});

describe("Admin Knowledge Documents", () => {
  test("AKB-1: renders the admin heading and lists documents via getAdminKnowledgeDocs", async () => {
    knowledgeApi.getAdminKnowledgeDocs.mockResolvedValue([
      { id: "doc-1", fileName: "company-handbook.pdf", fileSize: 20480, status: "READY", createdAt: new Date().toISOString() },
    ]);
    renderWithProviders(<AdminKnowledgePage />);

    expect(await screen.findByText("Knowledge Documents", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText("company-handbook.pdf", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(knowledgeApi.getAdminKnowledgeDocs).toHaveBeenCalled();
  });

  test("AKB-2: no documents shows the empty state", async () => {
    knowledgeApi.getAdminKnowledgeDocs.mockResolvedValue([]);
    renderWithProviders(<AdminKnowledgePage />);

    expect(await screen.findByText("No documents yet.", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});
