import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminAiConfigRoutePage from "@/app/admin/ai-config/page";
import type { RagRuntimeSettings, RagModelsList } from "@/features/admin/services/admin-rag-settings.service";

// Grounded in src/app/admin/ai-config/page.tsx and
// src/features/admin/components/ai-config/ai-config-page.tsx — Admin's AI/RAG
// runtime configuration page (LLM provider switch, chat connection, model
// params, save). No prior automated coverage existed. AdminRouteGuard/
// AdminAppShell stubbed to pass-through per the established admin-page
// pattern. Mocks admin-rag-settings.service (this page's own data) and
// knowledge.service's getAdminRagStatus (consumed by the embedded
// <AdminRagStatus> status widget — out of scope here, just needs to resolve
// so the page doesn't hang on a real network call).
//
// NOTE: the chat-model field is a <select> (Ollama provider with models
// available) whose selected <option> renders as "llama3.1:8b (local)", not
// bare "llama3.1:8b" — getByDisplayValue on a <select> matches the option's
// text content, not its value attribute — so tests check the combobox's own
// .value property instead. Every test gets an explicit 15000ms timeout, same
// gotcha as hr-dashboard.test.tsx (the 10000ms inner findBy timeout can
// otherwise still lose to Vitest's 5000ms per-test default).

vi.mock("@/features/admin/components/guards/admin-route-guard", () => ({
  AdminRouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/services/admin-rag-settings.service", () => ({
  getRagSettings: vi.fn(),
  listRagModels: vi.fn(),
  updateRagSettings: vi.fn(),
}));

vi.mock("@/features/knowledge/services/knowledge.service", () => ({
  getAdminRagStatus: vi.fn().mockResolvedValue(null),
}));

import * as ragApiTyped from "@/features/admin/services/admin-rag-settings.service";
const ragApi = ragApiTyped as unknown as {
  getRagSettings: ReturnType<typeof vi.fn>;
  listRagModels: ReturnType<typeof vi.fn>;
  updateRagSettings: ReturnType<typeof vi.fn>;
};

function settings(overrides: Partial<RagRuntimeSettings> = {}): RagRuntimeSettings {
  return {
    llmProvider: "ollama",
    chatBaseUrl: "http://localhost:11434/v1",
    chatApiKey: null,
    hasChatApiKey: false,
    chatModel: "llama3.1:8b",
    ollamaBaseUrl: "http://localhost:11434/v1",
    ollamaApiKey: null,
    hasOllamaApiKey: false,
    temperature: 0.3,
    topKSystem: 5,
    topKHr: 5,
    requestTimeoutSeconds: 120,
    embeddingModel: "nomic-embed-text",
    embeddingDimension: 768,
    chunkSize: 800,
    chunkOverlap: 100,
    ...overrides,
  };
}

function models(overrides: Partial<RagModelsList> = {}): RagModelsList {
  return { models: [{ name: "llama3.1:8b", isCloud: false }], errorMessage: null, ...overrides };
}

async function findChatModelSelect() {
  return (await screen.findByRole("combobox", {}, { timeout: 10000 })) as HTMLSelectElement;
}

beforeEach(() => {
  ragApi.getRagSettings.mockReset();
  ragApi.listRagModels.mockReset();
  ragApi.updateRagSettings.mockReset();
});

describe("Admin AI Config — load", () => {
  test(
    "AICFG-1: shows the saved provider, model, and temperature",
    async () => {
      ragApi.getRagSettings.mockResolvedValue(settings());
      ragApi.listRagModels.mockResolvedValue(models());
      renderWithProviders(<AdminAiConfigRoutePage />);

      expect(await screen.findByDisplayValue("http://localhost:11434/v1", {}, { timeout: 10000 })).toBeInTheDocument();
      expect((await findChatModelSelect()).value).toBe("llama3.1:8b");
      expect(screen.getByText("(0.3)")).toBeInTheDocument();
    },
    15000
  );

  test(
    "AICFG-2: a load failure shows Retry, and Retry re-fetches",
    async () => {
      ragApi.getRagSettings.mockRejectedValueOnce(new Error("network down"));
      ragApi.listRagModels.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderWithProviders(<AdminAiConfigRoutePage />);

      const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
      ragApi.getRagSettings.mockResolvedValue(settings());
      ragApi.listRagModels.mockResolvedValue(models());
      await user.click(retryBtn);

      expect((await findChatModelSelect()).value).toBe("llama3.1:8b");
    },
    15000
  );
});

describe("Admin AI Config — provider switch and save", () => {
  test(
    "AICFG-3: switching to OpenRouter fills the OpenRouter default base URL",
    async () => {
      ragApi.getRagSettings.mockResolvedValue(settings());
      ragApi.listRagModels.mockResolvedValue(models());
      const user = userEvent.setup();
      renderWithProviders(<AdminAiConfigRoutePage />);
      await findChatModelSelect();

      await user.click(screen.getByRole("button", { name: /OpenRouter/ }));

      expect(await screen.findByDisplayValue("https://openrouter.ai/api/v1", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );

  test(
    "AICFG-4: saving calls updateRagSettings with the edited temperature",
    async () => {
      ragApi.getRagSettings.mockResolvedValue(settings());
      ragApi.listRagModels.mockResolvedValue(models());
      ragApi.updateRagSettings.mockResolvedValue(settings({ temperature: 0.7 }));
      const user = userEvent.setup();
      renderWithProviders(<AdminAiConfigRoutePage />);
      await findChatModelSelect();

      const tempInput = screen.getByDisplayValue("0.3");
      await user.clear(tempInput);
      await user.type(tempInput, "0.7");
      await user.click(screen.getByRole("button", { name: "Save AI configuration" }));

      await vi.waitFor(() =>
        expect(ragApi.updateRagSettings).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.7 }))
      );
      expect(await screen.findByText("AI configuration saved", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );

  test(
    "AICFG-5: a save failure shows the API's own error message as a toast",
    async () => {
      ragApi.getRagSettings.mockResolvedValue(settings());
      ragApi.listRagModels.mockResolvedValue(models());
      ragApi.updateRagSettings.mockRejectedValue(new Error("Backend does not support saving AI config yet."));
      const user = userEvent.setup();
      renderWithProviders(<AdminAiConfigRoutePage />);
      await findChatModelSelect();

      await user.click(screen.getByRole("button", { name: "Save AI configuration" }));

      expect(
        await screen.findByText("Backend does not support saving AI config yet.", {}, { timeout: 10000 })
      ).toBeInTheDocument();
    },
    15000
  );
});
