"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertCircle, Loader2, X } from "lucide-react";
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
import type { GeneratedQuestion, QuestionAIChat } from "@/features/interview/types/generation-session";

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
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAISuggestion, setLastAISuggestion] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || loading) return;
    setError(null);
    setDraft("");

    const hrMsg: ChatMessage = {
      id: `hr-${Date.now()}`,
      role: "hr",
      content: trimmed,
    };
    setMessages((prev) => [...prev, hrMsg]);
    setLoading(true);

    try {
      // Mock AI response based on context
      await new Promise((r) => setTimeout(r, 1200));
      const suggestion = generateMockAIResponse(trimmed, question);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: suggestion,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLastAISuggestion(suggestion);
    } catch {
      setError(ai.errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleExamplePrompt(prompt: string) {
    setDraft(prompt);
  }

  return (
    <div className={cn(portalCard, "border-t-2 border-t-[#6c47ff] flex flex-col")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-6 h-6 rounded-lg bg-[#6c47ff]/10 flex items-center justify-center shrink-0">
          <Sparkles size={12} className="text-[#6c47ff]" />
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

      {/* Example prompts (shown when no messages) */}
      {messages.length === 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5">
          {ai.examplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleExamplePrompt(prompt)}
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#6c47ff] hover:text-[#6c47ff] transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-4 py-3 space-y-3 max-h-52 overflow-y-auto">
          {messages.map((msg) => {
            const isAI = msg.role === "ai";
            return (
              <div key={msg.id} className={cn("flex gap-2", !isAI && "flex-row-reverse")}>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    isAI ? "bg-[#6c47ff]/10 text-[#6c47ff]" : cn(portalMutedBg, portalHeading)
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
                  {msg.content}
                  {isAI && msg.id === messages[messages.length - 1]?.id && lastAISuggestion && (
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(lastAISuggestion)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#6c47ff] hover:underline"
                    >
                      <Sparkles size={11} />
                      {ai.applyBtn}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-[#6c47ff]/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#6c47ff]">AI</span>
              </div>
              <div className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs", portalBanner)}>
                <Loader2 size={11} className="text-[#6c47ff] animate-spin" />
                <span className="text-indigo-700 dark:text-indigo-300">{ai.sending}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
          <div ref={bottomRef} />
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
            disabled={loading}
            className={cn(
              "flex-1 resize-none rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
              portalInput,
              loading && "opacity-50 cursor-not-allowed"
            )}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || loading}
            className="shrink-0 w-9 h-9 self-end rounded-lg bg-[#6c47ff] text-white flex items-center justify-center transition-opacity disabled:opacity-40 hover:bg-[#5535dd]"
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

/** Generates a mock AI response based on the HR's prompt and the current question context. */
function generateMockAIResponse(prompt: string, question: GeneratedQuestion): string {
  const lp = prompt.toLowerCase();

  if (lp.includes("harder") || lp.includes("more difficult") || lp.includes("khó hơn")) {
    return `Here's a harder version:\n\n"${question.question} — additionally, design a system that handles 10,000 concurrent users, identifying potential bottlenecks and your mitigation strategy."\n\nThis adds a system design dimension and forces the candidate to think at scale.`;
  }
  if (lp.includes("behavioral") || lp.includes("hành vi")) {
    return `Behavioral version:\n\n"Tell me about a time you encountered a situation similar to: ${question.question.substring(0, 60)}... How did you approach it and what was the outcome?"`;
  }
  if (lp.includes("follow-up") || lp.includes("follow up")) {
    return `Follow-up question:\n\n"How would your approach change if the team size doubled and the timeline was cut in half? What trade-offs would you accept?"`;
  }
  if (lp.includes("explain") || lp.includes("rationale") || lp.includes("giải thích")) {
    return question.rationale
      ? `This question tests: ${question.rationale}\n\nIt's effective because it requires the candidate to demonstrate both theoretical knowledge and practical application, which correlates well with real-world performance.`
      : `This question is designed to assess the candidate's depth of knowledge in ${question.questionType.toLowerCase()} skills directly related to the role.`;
  }
  if (lp.includes("sample answer") || lp.includes("answer") || lp.includes("đáp án")) {
    return question.sampleAnswer
      ? `Refined sample answer:\n\n${question.sampleAnswer}\n\nKey evaluation points: depth of understanding, practical examples, acknowledgment of trade-offs.`
      : `A strong answer should: (1) demonstrate understanding of the core concept, (2) provide a concrete example, (3) acknowledge trade-offs or edge cases.`;
  }

  return `Based on the JD context and this ${question.questionType} question, I suggest:\n\nYou could reframe this to: "${question.question} — and how would you document your approach for future team members?"\n\nThis adds a collaboration/knowledge-sharing dimension that's valuable for senior roles.`;
}
