import { apiClient } from "@/core/api/http-client";

export type LlmProvider = "ollama" | "openrouter";

export interface RagRuntimeSettings {
  llmProvider: LlmProvider;
  chatBaseUrl: string;
  chatApiKey?: string | null;
  hasChatApiKey: boolean;
  chatModel: string;
  /** Embedding — luôn Ollama local */
  ollamaBaseUrl: string;
  ollamaApiKey?: string | null;
  hasOllamaApiKey: boolean;
  temperature: number;
  topKSystem: number;
  topKHr: number;
  requestTimeoutSeconds: number;
  embeddingModel: string;
  embeddingDimension: number;
  chunkSize: number;
  chunkOverlap: number;
  updatedAt?: string | null;
}

export interface UpdateRagRuntimeSettings {
  llmProvider: LlmProvider;
  chatBaseUrl: string;
  /** null/undefined = giữ nguyên; "" = xóa; khác = gán mới */
  chatApiKey?: string | null;
  chatModel: string;
  ollamaBaseUrl?: string;
  ollamaApiKey?: string | null;
  temperature: number;
  topKSystem: number;
  topKHr: number;
  requestTimeoutSeconds: number;
}

export interface RagModelItem {
  name: string;
  size?: number | null;
  digest?: string | null;
  isCloud: boolean;
}

export interface RagModelsList {
  models: RagModelItem[];
  errorMessage?: string | null;
}

const DEFAULT_RAG_SETTINGS: RagRuntimeSettings = {
  llmProvider: "ollama",
  chatBaseUrl: "http://localhost:11434/v1",
  chatApiKey: null,
  hasChatApiKey: false,
  chatModel: "",
  ollamaBaseUrl: "http://localhost:11434/v1",
  ollamaApiKey: null,
  hasOllamaApiKey: false,
  temperature: 0.3,
  topKSystem: 5,
  topKHr: 5,
  requestTimeoutSeconds: 120,
  embeddingModel: "",
  embeddingDimension: 768,
  chunkSize: 1200,
  chunkOverlap: 200,
  updatedAt: null,
};

function unwrapData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const d = raw as Record<string, unknown>;
  return (d.data && typeof d.data === "object" ? d.data : d) as Record<string, unknown>;
}

function normalizeProvider(v: unknown): LlmProvider {
  return v === "openrouter" ? "openrouter" : "ollama";
}

function normalizeSettings(raw: unknown): RagRuntimeSettings {
  const data = unwrapData(raw);
  const ollamaUrl =
    typeof data.ollamaBaseUrl === "string" ? data.ollamaBaseUrl : "http://localhost:11434/v1";
  const chatUrl =
    typeof data.chatBaseUrl === "string"
      ? data.chatBaseUrl
      : ollamaUrl;

  return {
    llmProvider: normalizeProvider(data.llmProvider),
    chatBaseUrl: chatUrl,
    chatApiKey: typeof data.chatApiKey === "string" ? data.chatApiKey : null,
    hasChatApiKey: Boolean(data.hasChatApiKey ?? data.hasOllamaApiKey),
    chatModel: typeof data.chatModel === "string" ? data.chatModel : "",
    ollamaBaseUrl: ollamaUrl,
    ollamaApiKey: typeof data.ollamaApiKey === "string" ? data.ollamaApiKey : null,
    hasOllamaApiKey: Boolean(data.hasOllamaApiKey),
    temperature: typeof data.temperature === "number" ? data.temperature : 0.3,
    topKSystem: typeof data.topKSystem === "number" ? data.topKSystem : 5,
    topKHr: typeof data.topKHr === "number" ? data.topKHr : 5,
    requestTimeoutSeconds:
      typeof data.requestTimeoutSeconds === "number" ? data.requestTimeoutSeconds : 120,
    embeddingModel: typeof data.embeddingModel === "string" ? data.embeddingModel : "",
    embeddingDimension: typeof data.embeddingDimension === "number" ? data.embeddingDimension : 768,
    chunkSize: typeof data.chunkSize === "number" ? data.chunkSize : 1200,
    chunkOverlap: typeof data.chunkOverlap === "number" ? data.chunkOverlap : 200,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
  };
}

function normalizeModels(raw: unknown): RagModelsList {
  const data = unwrapData(raw);
  const list = Array.isArray(data.models) ? data.models : [];
  return {
    models: list
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m) => ({
        name: typeof m.name === "string" ? m.name : "",
        size: typeof m.size === "number" ? m.size : null,
        digest: typeof m.digest === "string" ? m.digest : null,
        isCloud: Boolean(m.isCloud),
      }))
      .filter((m) => m.name),
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
  };
}

export async function getRagSettings(): Promise<RagRuntimeSettings> {
  try {
    const res = await apiClient.get("/api/admin/rag/settings");
    return normalizeSettings(res.data);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    // BE main hiện chưa có endpoint settings/models -> fallback để UI không bị fail toàn trang.
    if (status === 404 || status === 405) {
      return { ...DEFAULT_RAG_SETTINGS };
    }
    throw error;
  }
}

export async function updateRagSettings(
  settings: UpdateRagRuntimeSettings
): Promise<RagRuntimeSettings> {
  try {
    const res = await apiClient.put("/api/admin/rag/settings", settings);
    return normalizeSettings(res.data);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) {
      throw new Error("Backend does not support saving AI config yet (missing /api/admin/rag/settings).");
    }
    throw error;
  }
}

export async function listRagModels(): Promise<RagModelsList> {
  try {
    const res = await apiClient.get("/api/admin/rag/models");
    return normalizeModels(res.data);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) {
      return {
        models: [],
        errorMessage: "Backend does not support the model list endpoint yet (/api/admin/rag/models).",
      };
    }
    throw error;
  }
}
