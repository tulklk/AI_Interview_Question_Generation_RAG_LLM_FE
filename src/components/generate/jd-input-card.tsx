"use client";

import { FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalInput, portalSubtext } from "@/lib/portal-ui";

interface JdInputCardProps {
  value: string;
  onChange: (value: string) => void;
}

const MIN_CHARS = 400; // RAG API requires at least 400 characters / ~80 words

export function JdInputCard({ value, onChange }: JdInputCardProps) {
  const { t } = useLanguage();
  const ji = t.generatePage.jdInput;

  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const charCount = value.length;
  const isTooShort = charCount > 0 && charCount < MIN_CHARS;

  return (
    <div className="hr-glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-[#7C3AED] dark:text-[#a78bff]" />
        <h2 className={cn("text-base font-semibold", portalHeading)}>{ji.title}</h2>
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
              : "focus:ring-[#6c47ff]/20 focus:border-[#6c47ff]"
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
  );
}
