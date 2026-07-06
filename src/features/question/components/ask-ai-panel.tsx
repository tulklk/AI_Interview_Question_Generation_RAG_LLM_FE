"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertCircle, Loader2, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalBanner,
  portalCard,
  portalHeading,
  portalInput,
  portalMutedBg,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import { askAIAboutQuestion, getQuestionAIChat } from "@/features/question/services/question.service";
import type { GeneratedQuestion, QuestionSuggestion } from "@/features/interview/types/generation-session";

interface AskAIPanelProps {
  question: GeneratedQuestion;
  sessionId: string;
  onApplySuggestion: (suggestion: QuestionSuggestion) => void;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "ai" | "hr";
  content: string;
  suggestion?: QuestionSuggestion | null;
}

function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: QuestionSuggestion;
  onApply: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-primary/15">
        <Sparkles size={11} className="text-primary shrink-0" />
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Câu hỏi đề xuất</span>
      </div>

      {/* Question text */}
      <div className="px-3 py-2.5">
        <p className="text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {suggestion.question}
        </p>

        {/* Optional metadata badges */}
        {(suggestion.difficulty || suggestion.questionType) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestion.questionType && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                {suggestion.questionType}
              </span>
            )}
            {suggestion.difficulty && (
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded border",
                suggestion.difficulty.toLowerCase() === "hard"
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800/40"
                  : suggestion.difficulty.toLowerCase() === "medium"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/40"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/40"
              )}>
                {suggestion.difficulty}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Apply button */}
      <div className="px-3 pb-2.5">
        <button
          type="button"
          onClick={onApply}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <CheckCircle2 size={12} />
          Áp dụng câu hỏi này
        </button>
      </div>
    </div>
  );
}

export function AskAIPanel({
  question,
  sessionId,
  onApplySuggestion,
  onClose,
}: AskAIPanelProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const ai = rp.askAI;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAIMessageId, setLastAIMessageId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load existing chat history when panel opens
  useEffect(() => {
    if (sessionId.startsWith("local-")) {
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    async function loadHistory() {
      try {
        const history = await getQuestionAIChat(sessionId, question.id);
        if (cancelled) return;
        if (history.length > 0) {
          setMessages(history.map((h) => ({ id: h.id, role: h.role, content: h.content, suggestion: null })));
          // History responses don't carry suggestion metadata — Apply button stays hidden
        }
      } catch {
        // Non-fatal — start with empty chat if history fails
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [sessionId, question.id]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Synthetic IDs (q-0, stub-xxx, manual-xxx) mean the BE question ID isn't available
  const questionIdValid = !question.id.startsWith("q-") && !question.id.startsWith("stub-") && !question.id.startsWith("manual-");

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || loading || !questionIdValid) return;
    setError(null);
    setDraft("");

    const hrMsg: ChatMessage = { id: `hr-${Date.now()}`, role: "hr", content: trimmed };
    setMessages((prev) => [...prev, hrMsg]);
    setLoading(true);

    try {
      const { reply, suggestion } = await askAIAboutQuestion(sessionId, question.id, trimmed);
      const msgId = `ai-${Date.now()}`;
      const aiMsg: ChatMessage = { id: msgId, role: "ai", content: reply, suggestion };
      setMessages((prev) => [...prev, aiMsg]);
      setLastAIMessageId(msgId);
    } catch {
      setError(ai.errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const isEmpty = !historyLoading && messages.length === 0;

  return (
    <div className={cn(portalCard, "border-t-2 border-t-primary flex flex-col")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles size={12} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold", portalHeading)}>{ai.panelTitle}</p>
          <p className={cn("text-xs truncate", portalSubtext)}>{ai.panelSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn("p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800", portalSubtext)}
        >
          <X size={14} />
        </button>
      </div>

      {/* Loading history skeleton */}
      {historyLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-400 dark:text-gray-500">
          <Loader2 size={13} className="animate-spin text-primary" />
          <span>Đang tải lịch sử...</span>
        </div>
      )}

      {/* Example prompts — only shown when chat is empty */}
      {isEmpty && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5">
          {ai.examplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {!historyLoading && messages.length > 0 && (
        <div ref={messagesContainerRef} className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
          {messages.map((msg) => {
            const isAI = msg.role === "ai";
            const isLastAI = isAI && msg.id === lastAIMessageId;
            return (
              <div key={msg.id} className={cn("flex gap-2", !isAI && "flex-row-reverse")}>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                    isAI ? "bg-primary/10 text-primary" : cn(portalMutedBg, portalHeading)
                  )}
                >
                  {isAI ? "AI" : "HR"}
                </div>
                <div className={cn("max-w-[85%] text-xs leading-relaxed", isAI ? "flex-1" : "")}>
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2",
                      isAI
                        ? cn(portalBanner, "text-indigo-900 dark:text-indigo-100")
                        : cn(portalMutedBg, portalHeading)
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Suggestion card — shown below the AI bubble for the most recent AI reply */}
                  {isLastAI && msg.suggestion && (
                    <SuggestionCard
                      suggestion={msg.suggestion}
                      onApply={() => onApplySuggestion(msg.suggestion!)}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading bubble */}
          {loading && (
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">AI</span>
              </div>
              <div className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs", portalBanner)}>
                <Loader2 size={11} className="text-primary animate-spin" />
                <span className="text-indigo-700 dark:text-indigo-300">{ai.sending}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto flex items-center gap-1 font-medium hover:underline"
              >
                <RefreshCw size={11} />
                Thử lại
              </button>
            </div>
          )}

        </div>
      )}

      {/* Error when no messages */}
      {!historyLoading && messages.length === 0 && error && (
        <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        {!questionIdValid && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <AlertCircle size={12} className="shrink-0" />
            Câu hỏi này chưa được lưu lên server. Vui lòng lưu bản nháp trước khi hỏi AI.
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ai.placeholder}
            rows={2}
            disabled={loading || historyLoading || !questionIdValid}
            className={cn(
              "flex-1 resize-none rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
              portalInput,
              (loading || historyLoading || !questionIdValid) && "opacity-50 cursor-not-allowed"
            )}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || loading || historyLoading || !questionIdValid}
            className="shrink-0 w-9 h-9 self-end rounded-lg bg-primary text-white flex items-center justify-center transition-opacity disabled:opacity-40 hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
