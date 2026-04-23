"use client";

import { FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

interface JdInputCardProps {
  value: string;
  onChange: (value: string) => void;
}

const MIN_CHARS = 30;

export function JdInputCard({ value, onChange }: JdInputCardProps) {
  const { t } = useLanguage();
  const ji = t.generatePage.jdInput;

  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const charCount = value.length;
  const isTooShort = charCount > 0 && charCount < MIN_CHARS;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">{ji.title}</h2>
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ji.placeholder}
          rows={8}
          className={cn(
            "w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors",
            isTooShort
              ? "border-orange-300 focus:ring-orange-200 focus:border-orange-400"
              : "border-gray-200 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff]"
          )}
        />
        {value.length === 0 && (
          <p className="absolute top-12 left-4 text-xs text-gray-400 pointer-events-none select-none leading-relaxed">
            {ji.exampleLabel}<br />
            {ji.exampleText}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {wordCount} {wordCount === 1 ? ji.word : ji.words}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{charCount} {ji.chars}</span>
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
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {ji.clear}
          </button>
        )}
      </div>
    </div>
  );
}
