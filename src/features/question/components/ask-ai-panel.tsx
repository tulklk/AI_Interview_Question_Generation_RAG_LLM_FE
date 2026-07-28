"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Image from "next/image";
import { Send, Sparkles, AlertCircle, Loader2, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import { askAIAboutQuestion, getQuestionAIChat } from "@/features/question/services/question.service";
import { QuestionContent } from "@/shared/components/ui/question-content";
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
  labels,
}: {
  suggestion: QuestionSuggestion;
  onApply: () => void;
  labels: ReturnType<typeof useLanguage>["t"]["reviewPage"]["askAI"];
}) {
  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-primary/10">
        <Sparkles size={10} className="text-primary shrink-0" />
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{labels.suggestionLabel}</span>
      </div>
      <div className="px-3 py-2.5">
        <QuestionContent text={suggestion.question} className="text-xs leading-relaxed text-gray-800 dark:text-gray-200" />
        {(suggestion.difficulty || suggestion.questionType) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestion.questionType && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40 font-medium">
                {suggestion.questionType}
              </span>
            )}
            {suggestion.difficulty && (
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-md border font-medium",
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
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onApply}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <CheckCircle2 size={12} />
          {labels.applySuggestionBtn}
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
      const { reply, suggestion } = await askAIAboutQuestion(sessionId, question.id, trimmed, {
        question: question.question,
        questionType: question.questionType,
        difficulty: question.difficulty,
        rationale: question.rationale,
        sampleAnswer: question.sampleAnswer,
      });
      const msgId = `ai-${Date.now()}`;
      setMessages((prev) => [...prev, { id: msgId, role: "ai", content: reply, suggestion }]);
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

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/70"
        style={{ zIndex: 9998 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 flex flex-col rounded-t-2xl shadow-2xl bg-white dark:bg-gray-950 overflow-hidden h-[55vh]"
        style={{ zIndex: 9999 }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        {/* Gradient top accent */}
        <div className="h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400 shrink-0" />

        {/* Drag handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-9 h-0.75 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-3.5 pb-3.5 border-b border-gray-100 dark:border-gray-800/80 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-md shadow-primary/20 bg-white dark:bg-gray-900 flex items-center justify-center p-1">
            <Image src="/images/logo.png" alt="HireGen AI" width={28} height={28} className="object-contain w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-semibold leading-tight", portalHeading)}>{ai.panelTitle}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5 leading-tight">
              {question.question}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto">

          {/* Loading history */}
          {historyLoading && (
            <div className="flex items-center justify-center gap-2 h-full min-h-50 text-xs text-gray-400 dark:text-gray-500">
              <Loader2 size={13} className="animate-spin text-primary" />
              <span>Đang tải lịch sử...</span>
            </div>
          )}

          {/* Empty state — centered in available space */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full min-h-65 px-6 py-8 gap-6">
              {/* Icon + description */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center border border-primary/10 shadow-sm p-2">
                  <Image src="/images/logo.png" alt="HireGen AI" width={48} height={48} className="object-contain w-full h-full" />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", portalHeading)}>Hỏi AI về câu hỏi này</p>
                  <p className={cn("text-xs mt-1 max-w-xs leading-relaxed", portalSubtext)}>
                    {ai.panelSubtitle}
                  </p>
                </div>
              </div>

              {/* Prompt chips */}
              <div className="w-full max-w-lg">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider text-center mb-3", portalSubtext)}>
                  Gợi ý nhanh
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {ai.examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setDraft(prompt)}
                      className={cn(
                        "text-xs px-3.5 py-2 rounded-xl border transition-all duration-150",
                        "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400",
                        "hover:border-primary/40 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10",
                        "bg-gray-50/60 dark:bg-gray-900/60"
                      )}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {!historyLoading && messages.length > 0 && (
            <div className="px-5 py-5 space-y-4">
              {messages.map((msg) => {
                const isAI = msg.role === "ai";
                const isLastAI = isAI && msg.id === lastAIMessageId;
                return (
                  <div key={msg.id} className={cn("flex gap-2.5", !isAI && "flex-row-reverse")}>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5",
                        isAI
                          ? "bg-white dark:bg-gray-900 shadow-sm border border-primary/10 p-0.5"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {isAI ? <Image src="/images/logo.png" alt="AI" width={20} height={20} className="object-contain w-full h-full" /> : "HR"}
                    </div>
                    <div className={cn("max-w-[82%] text-sm leading-relaxed", isAI ? "flex-1" : "")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5",
                          isAI
                            ? "bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 rounded-tl-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tr-sm"
                        )}
                      >
                        <QuestionContent text={msg.content} />
                      </div>
                      {isLastAI && msg.suggestion && (
                        <SuggestionCard
                          suggestion={msg.suggestion}
                          onApply={() => onApplySuggestion(msg.suggestion!)}
                          labels={ai}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-primary/10 p-0.5">
                    <Image src="/images/logo.png" alt="AI" width={20} height={20} className="object-contain w-full h-full" />
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-indigo-50/80 dark:bg-indigo-950/30 text-sm">
                    <Loader2 size={11} className="text-primary animate-spin" />
                    <span className="text-indigo-700 dark:text-indigo-300">{ai.sending}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl px-3.5 py-2.5">
                  <AlertCircle size={12} className="shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError(null)} className="flex items-center gap-1 font-semibold hover:underline shrink-0">
                    <RefreshCw size={10} />
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          )}

          {!historyLoading && messages.length === 0 && error && (
            <div className="mx-5 mt-4 flex items-center gap-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Input — pinned to bottom */}
        <div className="px-5 pt-3 pb-5 border-t border-gray-100 dark:border-gray-800/80 shrink-0 bg-white dark:bg-gray-950">
          {!questionIdValid && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2.5 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
              <AlertCircle size={11} className="shrink-0" />
              Câu hỏi chưa được lưu. Vui lòng lưu bản nháp trước khi hỏi AI.
            </p>
          )}
          <div className="flex gap-2.5 items-end">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ai.placeholder}
              rows={2}
              disabled={loading || historyLoading || !questionIdValid}
              className={cn(
                "flex-1 resize-none rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors",
                "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
                "text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600",
                "focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
                (loading || historyLoading || !questionIdValid) && "opacity-50 cursor-not-allowed"
              )}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!draft.trim() || loading || historyLoading || !questionIdValid}
              className={cn(
                "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                "bg-linear-to-br from-violet-500 to-primary text-white shadow-md shadow-primary/25",
                "hover:shadow-lg hover:shadow-primary/30 hover:scale-105",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
              )}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
