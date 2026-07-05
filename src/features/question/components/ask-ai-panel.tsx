"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertCircle, Loader2, X, RefreshCw } from "lucide-react";
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
import type { GeneratedQuestion } from "@/features/interview/types/generation-session";

interface AskAIPanelProps {
  question: GeneratedQuestion;
  sessionId: string;
  onApplySuggestion: (suggestion: string) => void;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "ai" | "hr";
  content: string;
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
  const [lastAIContent, setLastAIContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          setMessages(history.map((h) => ({ id: h.id, role: h.role, content: h.content })));
          const lastAI = [...history].reverse().find((h) => h.role === "ai");
          if (lastAI) {
            setLastAIMessageId(lastAI.id);
            setLastAIContent(lastAI.content);
          }
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || loading) return;
    setError(null);
    setDraft("");

    const hrMsg: ChatMessage = { id: `hr-${Date.now()}`, role: "hr", content: trimmed };
    setMessages((prev) => [...prev, hrMsg]);
    setLoading(true);

    try {
      const response = await askAIAboutQuestion(sessionId, question.id, trimmed);
      const msgId = `ai-${Date.now()}`;
      const aiMsg: ChatMessage = { id: msgId, role: "ai", content: response };
      setMessages((prev) => [...prev, aiMsg]);
      setLastAIMessageId(msgId);
      setLastAIContent(response);
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
        <div className="px-4 py-3 space-y-3 max-h-60 overflow-y-auto">
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
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                    isAI
                      ? cn(portalBanner, "text-indigo-900 dark:text-indigo-100")
                      : cn(portalMutedBg, portalHeading)
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {isLastAI && lastAIContent && (
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(lastAIContent)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Sparkles size={11} />
                      {ai.applyBtn}
                    </button>
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

          <div ref={bottomRef} />
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
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ai.placeholder}
            rows={2}
            disabled={loading || historyLoading}
            className={cn(
              "flex-1 resize-none rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
              portalInput,
              (loading || historyLoading) && "opacity-50 cursor-not-allowed"
            )}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || loading || historyLoading}
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
