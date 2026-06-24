"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, AlertCircle, Loader2, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
  portalBanner,
  portalMutedBg,
} from "@/lib/portal-ui";
import type { ClarifyMessage } from "@/types/generation-session";

interface ClarifyPanelProps {
  messages: ClarifyMessage[];
  isLoading?: boolean;
  error?: string | null;
  onSend: (message: string) => void;
  onSkip: () => void;
}

export function ClarifyPanel({
  messages,
  isLoading = false,
  error = null,
  onSend,
  onSkip,
}: ClarifyPanelProps) {
  const { t } = useLanguage();
  const c = t.generationSessionPage.clarify;
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className={cn(portalCard, "shadow-sm flex flex-col max-h-[520px]")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-[#6c47ff]/10 flex items-center justify-center shrink-0">
          <MessageCircle size={15} className="text-[#6c47ff]" />
        </div>
        <div>
          <h3 className={cn("text-sm font-semibold", portalHeading)}>{c.heading}</h3>
          <p className={cn("text-xs", portalSubtext)}>{c.subtext}</p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className={cn(
            "ml-auto flex items-center gap-1.5 text-xs font-medium transition-colors",
            portalSubtext,
            "hover:text-[#6c47ff]"
          )}
        >
          <SkipForward size={13} />
          {c.skipToGenerate}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
        {messages.map((msg) => {
          const isAI = msg.role === "ai";
          return (
            <div
              key={msg.id}
              className={cn("flex gap-3", !isAI && "flex-row-reverse")}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isAI
                    ? "bg-[#6c47ff]/10 text-[#6c47ff]"
                    : cn(portalMutedBg, portalHeading)
                )}
              >
                {isAI ? "AI" : "HR"}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                  isAI
                    ? cn(portalBanner, "text-indigo-900 dark:text-indigo-100")
                    : cn(portalMutedBg, portalHeading)
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#6c47ff]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#6c47ff]">AI</span>
            </div>
            <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm", portalBanner)}>
              <Loader2 size={13} className="text-[#6c47ff] animate-spin" />
              <span className="text-indigo-700 dark:text-indigo-300">{c.sending}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t border-gray-100 dark:border-gray-800"
      >
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={c.inputPlaceholder}
            rows={2}
            disabled={isLoading}
            className={cn(
              "flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
              portalInput,
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isLoading}
            className="shrink-0 w-10 h-10 self-end rounded-lg bg-[#6c47ff] text-white flex items-center justify-center transition-opacity disabled:opacity-40 hover:bg-[#5535dd]"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
