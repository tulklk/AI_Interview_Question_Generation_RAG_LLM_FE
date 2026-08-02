"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Loader2, RefreshCw, Server, Cloud, KeyRound, SlidersHorizontal, Database } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { cn } from "@/lib/cn";
import {
  portalDivider,
  portalHeading,
  portalHeadingAlt,
  portalInput,
  portalSubtext,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { AdminRagStatus } from "@/features/admin/components/dashboard/admin-rag-status";
import {
  getRagSettings,
  listRagModels,
  updateRagSettings,
  type LlmProvider,
  type RagModelItem,
  type RagRuntimeSettings,
} from "@/features/admin/services/admin-rag-settings.service";

const OLLAMA_DEFAULT_URL = "http://localhost:11434/v1";
const OPENROUTER_DEFAULT_URL = "https://openrouter.ai/api/v1";

const inputCls = cn(
  portalInput,
  "w-full px-3.5 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
);

const COPY_FALLBACK = {
  heading: "Cấu hình AI",
  subtext: "Chat LLM: Ollama hoặc OpenRouter. Embedding luôn Ollama local.",
  statusTitle: "Trạng thái dịch vụ RAG",
  statusHint: "Kiểm tra kết nối RAG, cấu hình và database vector.",
  providerTitle: "Provider Chat LLM",
  providerHint: "Chỉ đổi model sinh text. Embedding / RAG vector vẫn dùng Ollama local.",
  ollamaDesc: "Local hoặc cloud qua Ollama (model đã pull).",
  openrouterDesc: "Gọi nhiều model cloud qua OpenRouter — không ảnh hưởng embed.",
  connectionTitle: "Kết nối Chat LLM",
  connectionHint: "URL + API key cho chat. Embedding tách riêng bên dưới.",
  baseUrl: "Chat Base URL",
  apiKey: "Chat API Key",
  apiKeyConfigured: "đã cấu hình",
  apiKeyKeepPlaceholder: "•••••••• (để trống = giữ nguyên)",
  apiKeyOpenRouterPlaceholder: "sk-or-… (bắt buộc với OpenRouter)",
  apiKeyOptionalPlaceholder: "Tuỳ chọn — cloud/proxy",
  clearApiKey: "Xóa Chat API key đã lưu",
  llmTitle: "Mô hình & tham số",
  chatModel: "Chat / LLM model",
  cloudTag: "cloud",
  localTag: "local",
  ollamaModelHint: "Danh sách lấy từ Ollama /api/tags (model đã pull).",
  openrouterModelHint: "Nhập model id OpenRouter, ví dụ openai/gpt-4o-mini (không dùng gemma4b:cloud).",
  temperature: "Temperature",
  tempHint: "0 = ổn định, 2 = sáng tạo hơn",
  timeout: "Timeout (giây)",
  refreshModels: "Làm mới",
  refreshModelsBtn: "Tải lại model / status",
  retrievalTitle: "Retrieval & Embedding (Ollama local)",
  retrievalHint: "Top-K + embedding luôn chạy qua Ollama local — không đổi khi chọn OpenRouter.",
  readOnlyTitle: "Embedding (cố định Ollama)",
  saveBtn: "Lưu cấu hình AI",
  saveSuccess: "Đã lưu cấu hình AI",
  saveError: "Không thể lưu cấu hình AI",
  loadError: "Không tải được cấu hình AI",
  retry: "Thử lại",
} as const;

export function AiConfigPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const copy = t.adminPages.aiConfigPage ?? COPY_FALLBACK;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [provider, setProvider] = useState<LlmProvider>("ollama");
  const [chatBaseUrl, setChatBaseUrl] = useState(OLLAMA_DEFAULT_URL);
  const [chatApiKeyInput, setChatApiKeyInput] = useState("");
  const [hasChatApiKey, setHasChatApiKey] = useState(false);
  const [clearChatApiKey, setClearChatApiKey] = useState(false);
  const [chatModel, setChatModel] = useState("");
  const [temperature, setTemperature] = useState("0.3");
  const [topKSystem, setTopKSystem] = useState("5");
  const [topKHr, setTopKHr] = useState("5");
  const [requestTimeoutSeconds, setRequestTimeoutSeconds] = useState("120");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(OLLAMA_DEFAULT_URL);
  const [readOnly, setReadOnly] = useState<Pick<
    RagRuntimeSettings,
    "embeddingModel" | "embeddingDimension" | "chunkSize" | "chunkOverlap"
  > | null>(null);

  const [models, setModels] = useState<RagModelItem[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setLoadError(false);
    try {
      const [settings, modelList] = await Promise.all([getRagSettings(), listRagModels()]);
      setProvider(settings.llmProvider);
      setChatBaseUrl(settings.chatBaseUrl);
      setHasChatApiKey(settings.hasChatApiKey);
      setChatApiKeyInput("");
      setClearChatApiKey(false);
      setChatModel(settings.chatModel);
      setTemperature(String(settings.temperature));
      setTopKSystem(String(settings.topKSystem));
      setTopKHr(String(settings.topKHr));
      setRequestTimeoutSeconds(String(settings.requestTimeoutSeconds));
      setOllamaBaseUrl(settings.ollamaBaseUrl || OLLAMA_DEFAULT_URL);
      setReadOnly({
        embeddingModel: settings.embeddingModel,
        embeddingDimension: settings.embeddingDimension,
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap,
      });
      setModels(modelList.models);
      setModelsError(modelList.errorMessage ?? null);

      if (
        settings.chatModel &&
        modelList.models.length > 0 &&
        !modelList.models.some((m) => m.name === settings.chatModel)
      ) {
        setModels((prev) => [
          {
            name: settings.chatModel,
            isCloud: settings.chatModel.toLowerCase().includes("cloud"),
          },
          ...prev,
        ]);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function switchProvider(next: LlmProvider) {
    if (next === provider) return;
    setProvider(next);
    if (next === "ollama") {
      setChatBaseUrl(ollamaBaseUrl || OLLAMA_DEFAULT_URL);
    } else {
      setChatBaseUrl(OPENROUTER_DEFAULT_URL);
      // Gợi ý xóa model Ollama cũ để Admin nhập OpenRouter id
      if (chatModel.includes(":") && !chatModel.includes("/")) {
        setChatModel("");
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Parameters<typeof updateRagSettings>[0] = {
        llmProvider: provider,
        chatBaseUrl: chatBaseUrl.trim(),
        chatModel: chatModel.trim(),
        ollamaBaseUrl: ollamaBaseUrl.trim() || OLLAMA_DEFAULT_URL,
        temperature: Number(temperature),
        topKSystem: Number(topKSystem),
        topKHr: Number(topKHr),
        requestTimeoutSeconds: Number(requestTimeoutSeconds),
      };

      if (clearChatApiKey) {
        payload.chatApiKey = "";
      } else if (chatApiKeyInput.trim()) {
        payload.chatApiKey = chatApiKeyInput.trim();
      }

      const saved = await updateRagSettings(payload);
      setProvider(saved.llmProvider);
      setChatBaseUrl(saved.chatBaseUrl);
      setHasChatApiKey(saved.hasChatApiKey);
      setChatApiKeyInput("");
      setClearChatApiKey(false);
      setOllamaBaseUrl(saved.ollamaBaseUrl);
      addToast("success", copy.saveSuccess);

      const modelList = await listRagModels();
      setModels(modelList.models);
      setModelsError(modelList.errorMessage ?? null);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  const modelOptions = useMemo(() => {
    if (models.length > 0) return models;
    if (chatModel) {
      return [{ name: chatModel, isCloud: chatModel.toLowerCase().includes("cloud") }];
    }
    return [];
  }, [models, chatModel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className={cn("text-sm", portalSubtextAlt)}>{copy.loadError}</p>
        <button
          type="button"
          onClick={loadAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <RefreshCw size={12} />
          {copy.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="hr-glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center">
            <Server size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <div>
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{copy.statusTitle}</h3>
            <p className={cn("text-xs", portalSubtext)}>{copy.statusHint}</p>
          </div>
        </div>
        <AdminRagStatus />
      </section>

      <section className="hr-glass-card p-5 space-y-4">
        <div>
          <h3 className={cn("text-sm font-semibold", portalHeading)}>{copy.providerTitle}</h3>
          <p className={cn("text-xs mt-1", portalSubtext)}>{copy.providerHint}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => switchProvider("ollama")}
            className={cn(
              "text-left rounded-xl border px-4 py-3 transition-all",
              provider === "ollama"
                ? "border-[#7C3AED] bg-[rgba(124,58,237,0.08)]"
                : "border-transparent bg-gray-50 dark:bg-gray-900/40 hover:border-[rgba(124,58,237,0.35)]"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Server size={16} className="text-[#7C3AED]" />
              <span className={cn("text-sm font-semibold", portalHeading)}>Ollama</span>
            </div>
            <p className={cn("text-xs", portalSubtext)}>{copy.ollamaDesc}</p>
          </button>
          <button
            type="button"
            onClick={() => switchProvider("openrouter")}
            className={cn(
              "text-left rounded-xl border px-4 py-3 transition-all",
              provider === "openrouter"
                ? "border-[#7C3AED] bg-[rgba(124,58,237,0.08)]"
                : "border-transparent bg-gray-50 dark:bg-gray-900/40 hover:border-[rgba(124,58,237,0.35)]"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cloud size={16} className="text-[#7C3AED]" />
              <span className={cn("text-sm font-semibold", portalHeading)}>OpenRouter</span>
            </div>
            <p className={cn("text-xs", portalSubtext)}>{copy.openrouterDesc}</p>
          </button>
        </div>
      </section>

      <section className="hr-glass-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center">
            <KeyRound size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <div>
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{copy.connectionTitle}</h3>
            <p className={cn("text-xs", portalSubtext)}>{copy.connectionHint}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>{copy.baseUrl}</label>
            <input
              type="url"
              value={chatBaseUrl}
              onChange={(e) => setChatBaseUrl(e.target.value)}
              className={inputCls}
              placeholder={provider === "openrouter" ? OPENROUTER_DEFAULT_URL : OLLAMA_DEFAULT_URL}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>
              {copy.apiKey}{" "}
              {hasChatApiKey ? <span className={portalSubtext}>({copy.apiKeyConfigured})</span> : null}
            </label>
            <input
              type="password"
              value={chatApiKeyInput}
              onChange={(e) => {
                setChatApiKeyInput(e.target.value);
                setClearChatApiKey(false);
              }}
              className={inputCls}
              placeholder={
                hasChatApiKey
                  ? copy.apiKeyKeepPlaceholder
                  : provider === "openrouter"
                    ? copy.apiKeyOpenRouterPlaceholder
                    : copy.apiKeyOptionalPlaceholder
              }
              autoComplete="new-password"
            />
            {hasChatApiKey ? (
              <label className={cn("flex items-center gap-2 text-xs mt-1", portalSubtext)}>
                <input
                  type="checkbox"
                  checked={clearChatApiKey}
                  onChange={(e) => {
                    setClearChatApiKey(e.target.checked);
                    if (e.target.checked) setChatApiKeyInput("");
                  }}
                />
                {copy.clearApiKey}
              </label>
            ) : null}
          </div>
        </div>

        <div className={cn("pt-4 border-t space-y-4", portalDivider)}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[#7C3AED]" />
            <h4 className={cn("text-sm font-semibold", portalHeading)}>{copy.llmTitle}</h4>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>{copy.chatModel}</label>
            {provider === "ollama" && modelOptions.length > 0 ? (
              <select
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className={inputCls}
              >
                {modelOptions.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                    {m.isCloud ? ` (${copy.cloudTag})` : ` (${copy.localTag})`}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className={inputCls}
                placeholder={
                  provider === "openrouter" ? "openai/gpt-4o-mini" : "gemma4b:cloud"
                }
              />
            )}
            <p className={cn("text-xs", portalSubtext)}>
              {provider === "openrouter" ? copy.openrouterModelHint : copy.ollamaModelHint}
            </p>
            {modelsError && provider === "ollama" ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{modelsError}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>
                {copy.temperature}{" "}
                <span className={cn("font-normal", portalSubtext)}>({temperature})</span>
              </label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className={inputCls}
              />
              <p className={cn("text-xs", portalSubtext)}>{copy.tempHint}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>{copy.timeout}</label>
              <input
                type="number"
                min={10}
                max={600}
                value={requestTimeoutSeconds}
                onChange={(e) => setRequestTimeoutSeconds(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>{copy.refreshModels}</label>
              <button
                type="button"
                onClick={loadAll}
                className={cn(
                  inputCls,
                  "inline-flex items-center justify-center gap-2 font-medium hover:border-[#7C3AED]/40"
                )}
              >
                <RefreshCw size={14} />
                {copy.refreshModelsBtn}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="hr-glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg hr-icon-box flex items-center justify-center">
            <Database size={15} className="text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <div>
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{copy.retrievalTitle}</h3>
            <p className={cn("text-xs", portalSubtext)}>{copy.retrievalHint}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>Top-K SYSTEM</label>
            <input
              type="number"
              min={1}
              max={20}
              value={topKSystem}
              onChange={(e) => setTopKSystem(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>Top-K HR</label>
            <input
              type="number"
              min={1}
              max={20}
              value={topKHr}
              onChange={(e) => setTopKHr(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className={cn("rounded-xl border px-4 py-3 text-xs space-y-1", portalDivider)}>
          <p className={cn("font-medium", portalHeadingAlt)}>{copy.readOnlyTitle}</p>
          <p className={portalSubtextAlt}>
            URL: {ollamaBaseUrl}
            {readOnly
              ? ` · ${readOnly.embeddingModel} (${readOnly.embeddingDimension}d) · Chunk ${readOnly.chunkSize}/${readOnly.chunkOverlap}`
              : null}
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || !chatModel.trim() || !chatBaseUrl.trim()}
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {copy.saveBtn}
        </button>
      </div>
    </div>
  );
}
