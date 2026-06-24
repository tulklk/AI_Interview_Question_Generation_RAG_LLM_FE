"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import type { GenerationStatus } from "@/types/generation-session";

const statusStyles: Record<GenerationStatus, string> = {
  DRAFT: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  PLAN_QUEUED: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  PLAN_PROPOSED: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  CONFIRMED: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  QUEUED: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  QUESTION_QUEUED: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  QUESTION_PROCESSING: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  PROCESSING: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  COMPLETED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  FAILED: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

const statusDots: Record<GenerationStatus, string> = {
  DRAFT: "bg-gray-400",
  PLAN_QUEUED: "bg-amber-500 animate-pulse",
  PLAN_PROPOSED: "bg-blue-500",
  CONFIRMED: "bg-indigo-500",
  QUEUED: "bg-amber-500",
  QUESTION_QUEUED: "bg-amber-500 animate-pulse",
  QUESTION_PROCESSING: "bg-violet-500 animate-pulse",
  PROCESSING: "bg-violet-500 animate-pulse",
  COMPLETED: "bg-emerald-500",
  FAILED: "bg-red-500",
};

interface SessionStatusBadgeProps {
  status: GenerationStatus;
  size?: "sm" | "md";
}

export function SessionStatusBadge({ status, size = "sm" }: SessionStatusBadgeProps) {
  const { t } = useLanguage();
  const label = t.generationSessionPage.status[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-md",
        statusStyles[status],
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDots[status])} />
      {label}
    </span>
  );
}
