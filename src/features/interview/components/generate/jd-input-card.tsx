"use client";

import { useState } from "react";
import { FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import { SampleJdModal } from "@/features/studio/components/sample-jd-modal";

interface JdInputCardProps {
  value: string;
  onChange: (value: string) => void;
  /** Khóa nhập JD khi Free hết lượt generate */
  disabled?: boolean;
}

const MIN_CHARS = 400;

export function JdInputCard({ value, onChange, disabled = false }: JdInputCardProps) {
  const { t } = useLanguage();
  const ji = t.generatePage.jdInput;
  const [modalMounted, setModalMounted] = useState(false);

  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const charCount = value.length;
  const isTooShort = charCount > 0 && charCount < MIN_CHARS;

  return (
    <>
      <div className={cn("hr-glass-card p-6 relative", disabled && "opacity-70")}>
        {disabled && (
          <div
            className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl"
            title={t.generatePage.quota.exceededTitle}
            aria-hidden
          />
        )}
        <fieldset disabled={disabled} className="min-w-0 border-0 p-0 m-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h3 className={cn("font-semibold text-sm", portalHeading)}>{ji.title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setModalMounted(true)}
            disabled={disabled}
            className="text-xs text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          >
            {ji.sampleBtn}
          </button>
        </div>

        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={ji.placeholder}
            rows={8}
            disabled={disabled}
            className={cn(
              "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
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
        </fieldset>
      </div>

      {modalMounted && !disabled && (
        <SampleJdModal
          onClose={() => setModalMounted(false)}
          onUse={(content) => onChange(content)}
        />
      )}
    </>
  );
}
