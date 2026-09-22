import { describe, test, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminAiConfigRoutePage from "@/app/admin/ai-config/page";
import type { RagStatus } from "@/features/knowledge/services/knowledge.service";

// Grounded in src/app/admin/ai-config/page.tsx and
// src/features/admin/components/ai-config/ai-config-page.tsx.
//
// The page used to be an editable LLM provider/model form backed by
// GET|PUT /api/admin/rag/settings and GET /api/admin/rag/models — neither
// endpoint exists on the backend, so every visit fired two 404s and the Save
// button could never succeed. It is now read-only: just the RAG status panel
// (backed by the one endpoint that does exist, /api/admin/rag/status). This
// replaces the old 5-test form suite (AICFG-1..5) with a single smoke test
// for the current page — the status widget itself has no dedicated coverage
// yet and is out of scope here.
vi.mock("@/features/admin/components/guards/admin-route-guard", () => ({
  AdminRouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/knowledge/services/knowledge.service", () => ({
  getAdminRagStatus: vi.fn(),
}));

import * as knowledgeApiTyped from "@/features/knowledge/services/knowledge.service";
const knowledgeApi = knowledgeApiTyped as unknown as {
  getAdminRagStatus: ReturnType<typeof vi.fn>;
};

function ragStatus(overrides: Partial<RagStatus> = {}): RagStatus {
  return {
    isHealthy: true,
    checks: [],
    serviceUrl: "https://iqgsrag.cloud",
    responseTimeMs: 120,
    ...overrides,
  };
}

test(
  "AICFG-1: renders the read-only RAG status panel, no editable form controls",
  async () => {
    knowledgeApi.getAdminRagStatus.mockResolvedValue(ragStatus());
    renderWithProviders(<AdminAiConfigRoutePage />);

    expect(await screen.findByText("RAG service status", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save AI configuration" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /OpenRouter/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  },
  15000
);
