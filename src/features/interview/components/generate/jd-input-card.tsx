"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, AlertCircle, BookOpen, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";

interface JdInputCardProps {
  value: string;
  onChange: (value: string) => void;
}

const MIN_CHARS = 400;
const MODAL_ANIM_MS = 220;

function SampleModal({ onRequestClose, onUse, ji }: {
  onRequestClose: () => void;
  onUse: (content: string) => void;
  ji: ReturnType<typeof useLanguage>["t"]["generatePage"]["jdInput"];
}) {
  const m = ji.sampleModal;
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  function handleClose() {
    setVisible(false);
    closeTimerRef.current = setTimeout(onRequestClose, MODAL_ANIM_MS);
  }

  function handleCopy() {
    navigator.clipboard.writeText(m.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDuration: `${MODAL_ANIM_MS}ms` }}
        onClick={handleClose}
      />

      {/* Modal card */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]",
          "transition-all ease-[cubic-bezier(0.34,1.4,0.64,1)]",
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-3"
        )}
        style={{ transitionDuration: `${MODAL_ANIM_MS}ms` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <BookOpen size={15} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold leading-tight", portalHeading)}>{m.title}</p>
              <p className={cn("text-[11px] mt-0.5", portalSubtext)}>{m.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5 shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className={cn(
            "text-[13px] leading-relaxed whitespace-pre-wrap font-sans rounded-xl p-4",
            "bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50",
            portalHeading
          )}>
            {m.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5 shrink-0" />
        <div className="flex items-center gap-2 px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-colors",
              "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
              portalHeading
            )}
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? "Đã sao chép" : "Copy"}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "h-8 px-4 text-xs font-semibold rounded-lg border transition-colors",
              "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
              portalHeading
            )}
          >
            {m.closeBtn}
          </button>
          <button
            type="button"
            onClick={() => { onUse(m.content); handleClose(); }}
            className="shimmer-button h-8 px-4 text-xs font-semibold text-white hr-cta-btn rounded-lg"
          >
            {m.useBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function JdInputCard({ value, onChange }: JdInputCardProps) {
  const { t } = useLanguage();
  const ji = t.generatePage.jdInput;
  const [modalMounted, setModalMounted] = useState(false);

  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const charCount = value.length;
  const isTooShort = charCount > 0 && charCount < MIN_CHARS;

  return (
    <>
      <div className="hr-glass-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#7C3AED] dark:text-[#a78bff]" />
            <h2 className={cn("text-base font-semibold", portalHeading)}>{ji.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalMounted(true)}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold rounded-lg border transition-colors",
              "border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400",
              "hover:bg-violet-50 dark:hover:bg-violet-950/40"
            )}
          >
            <BookOpen size={11} />
            {ji.sampleBtn}
          </button>
        </div>

        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={ji.placeholder}
            rows={8}
            className={cn(
              "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors",
              portalInput,
              isTooShort
                ? "border-orange-300 dark:border-orange-700 focus:ring-orange-200 dark:focus:ring-orange-900 focus:border-orange-400"
                : "focus:ring-primary/20 focus:border-primary"
            )}
          />
          {value.length === 0 && (
            <p className={cn("absolute top-12 left-4 text-xs pointer-events-none select-none leading-relaxed", portalSubtext)}>
              {ji.exampleLabel}<br />
              {ji.exampleText}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className={cn("text-xs", portalSubtext)}>
              {wordCount} {wordCount === 1 ? ji.word : ji.words}
            </span>
            <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
            <span className={cn("text-xs", portalSubtext)}>{charCount} {ji.chars}</span>
            {isTooShort && (
              <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                <AlertCircle size={11} />
                {ji.tooShort}
              </span>
            )}
          </div>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={cn("text-xs transition-colors hover:text-gray-600 dark:hover:text-gray-300", portalSubtext)}
            >
              {ji.clear}
            </button>
          )}
        </div>
      </div>

      {modalMounted && (
        <SampleModal
          ji={ji}
          onRequestClose={() => setModalMounted(false)}
          onUse={(content) => onChange(content)}
        />
      )}
    </>
  );
}
