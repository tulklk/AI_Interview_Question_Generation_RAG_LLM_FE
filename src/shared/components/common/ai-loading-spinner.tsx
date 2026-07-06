"use client";

import { cn } from "@/lib/cn";

interface AiLoadingSpinnerProps {
  text?: string;
  subtext?: string;
  className?: string;
}

export function AiLoadingSpinner({ text, subtext, className }: AiLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative flex items-center justify-center">
        <div className="ai-spin-glow" />
        <div className="ai-spin-outer" />
        <div className="absolute ai-spin-inner" />
      </div>
      {text && (
        <div className="text-center">
          <p className="text-[15px] font-semibold ai-status-text">{text}</p>
          {subtext && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
      )}
    </div>
  );
}
