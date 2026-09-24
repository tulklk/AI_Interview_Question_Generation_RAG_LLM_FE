"use client";

import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";

interface AiLoadingSpinnerProps {
  /** Pass empty string to hide label (compact inline use). */
  text?: string;
  subtext?: string;
  className?: string;
}

export function AiLoadingSpinner({ text, subtext, className }: AiLoadingSpinnerProps) {
  const { t } = useLanguage();
  const label = text === undefined ? t.common.loading : text;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative flex items-center justify-center">
        <div className="ai-spin-glow" />
        <div className="ai-spin-outer" />
        <div className="absolute ai-spin-inner" />
      </div>
      {label ? (
        <div className="text-center">
          <p className="text-[15px] font-semibold ai-status-text">{label}</p>
          {subtext && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
