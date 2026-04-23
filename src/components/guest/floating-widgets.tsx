"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowUp,
  Bot,
  X,
  Send,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

/* ─────────────────────────────── types ─────────────────────── */

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
}

/* ─────────────────────────────── response engine ───────────── */

function getBotReply(
  input: string,
  responses: Record<string, string>
): string {
  const q = input.toLowerCase();
  if (/pric|plan|cost|free|pro|enterprise|giá|gói/.test(q))
    return responses.pricing;
  if (/feature|tính năng|extract|keyword|generat/.test(q))
    return responses.features;
  if (/how|work|step|hoạt động|cách|bước/.test(q))
    return responses.howItWorks;
  if (/export|pdf|download|xuất/.test(q))
    return responses.export;
  if (/vietnam|việt|tiếng việt|vi/.test(q))
    return responses.vietnamese;
  return responses.fallback;
}

/* ─────────────────────────────── BotAvatar ─────────────────── */

function BotAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <Bot size={size * 0.5} className="text-white" />
    </div>
  );
}

/* ─────────────────────────────── ChatPanel ─────────────────── */

function ChatPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const cw = t.chatWidget;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [msgId, setMsgId] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* Reset on language change */
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsTyping(false);
  }, [cw.title]);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: msgId, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setMsgId((n) => n + 1);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const reply = getBotReply(trimmed, cw.responses);
      setMessages((prev) => [
        ...prev,
        { id: msgId + 1, role: "bot", text: reply },
      ]);
      setMsgId((n) => n + 2);
      setIsTyping(false);
    }, 900 + Math.random() * 400);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setIsTyping(false);
  }

  return (
    <div
      className={cn(
        "absolute bottom-16 right-0 w-80 sm:w-96 rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden",
        "transition-all duration-300 origin-bottom-right",
        isOpen
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      )}
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      {/* ── Header ── */}
      <div className="bg-[#6c47ff] px-4 py-3 flex items-center gap-3">
        <BotAvatar size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-none truncate">
            {cw.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-white/70">{cw.subtitle}</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          title={cw.clear}
          className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <Trash2 size={15} />
        </button>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 460 }}>
        {/* Welcome card */}
        <div className="flex items-start gap-2.5">
          <BotAvatar size={28} />
          <div className="bg-[#f5f3ff] border border-[#6c47ff]/15 rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={11} className="text-[#6c47ff]" />
              <span className="text-[10px] font-bold text-[#6c47ff] uppercase tracking-wide">
                HireGen AI
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              {cw.welcomeMessage}
            </p>
            <ul className="space-y-1">
              {cw.welcomePoints.map((point, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="text-[#6c47ff] mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suggested questions — visible only before any message is sent */}
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-wrap gap-2 pl-9 animate-fade-up" style={{ animationDelay: "150ms" }}>
            {cw.suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs font-medium text-[#6c47ff] bg-[#6c47ff]/8 hover:bg-[#6c47ff]/15 border border-[#6c47ff]/20 hover:border-[#6c47ff]/40 px-3 py-1.5 rounded-full transition-all duration-200 text-left"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) =>
          msg.role === "bot" ? (
            <div key={msg.id} className="flex items-start gap-2.5 animate-fade-up">
              <BotAvatar size={28} />
              <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">
                  {msg.text}
                </p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-end animate-fade-up">
              <div className="bg-[#6c47ff] rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]">
                <p className="text-xs text-white leading-relaxed">{msg.text}</p>
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5 animate-fade-up">
            <BotAvatar size={28} />
            <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-gray-100 p-3 flex items-center gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={cw.placeholder}
          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-[#6c47ff]/50 focus:ring-2 focus:ring-[#6c47ff]/10 transition-all placeholder:text-gray-400"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0",
            input.trim() && !isTyping
              ? "bg-[#6c47ff] text-white hover:bg-[#5535dd] shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── FloatingWidgets (main) ─────── */

export function FloatingWidgets() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onScroll() {
      setShowScrollTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      <div className="relative">
        <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Chat FAB */}
        <button
          onClick={() => setIsChatOpen((v) => !v)}
          className={cn(
            "w-14 h-14 rounded-full bg-[#6c47ff] hover:bg-[#5535dd] text-white shadow-xl",
            "flex items-center justify-center transition-all duration-200",
            "hover:scale-105 active:scale-95",
            mounted ? "animate-scale-in" : "opacity-0"
          )}
          aria-label="Open AI chat"
        >
          <div
            className={cn(
              "transition-transform duration-300",
              isChatOpen ? "rotate-90 scale-90" : "rotate-0 scale-100"
            )}
          >
            {isChatOpen ? <X size={22} /> : <Bot size={22} />}
          </div>
        </button>
      </div>

      {/* Scroll-to-top FAB */}
      <button
        onClick={scrollToTop}
        className={cn(
          "w-11 h-11 rounded-full bg-white border border-gray-200 text-gray-600 shadow-md",
          "flex items-center justify-center hover:text-[#6c47ff] hover:border-[#6c47ff]/40 hover:shadow-lg",
          "transition-all duration-300",
          showScrollTop
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-90 translate-y-2 pointer-events-none"
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp size={17} />
      </button>
    </div>
  );
}
