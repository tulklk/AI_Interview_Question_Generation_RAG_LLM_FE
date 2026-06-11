import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Difficulty, QuestionCategory } from "@/types/jobseeker";

interface PillProps {
  className?: string;
  children: ReactNode;
  size?: "sm" | "md";
}

export function Pill({ className, children, size = "md" }: PillProps) {
  return (
    <span
      className={cn(
        "shrink-0 font-[600] rounded-[6px]",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1",
        className,
      )}
    >
      {children}
    </span>
  );
}

const DIFFICULTY_BADGE_CLASS: Record<Difficulty, string> = {
  Easy: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  Medium: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  Hard: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
};

export function getDifficultyBadgeClass(difficulty: Difficulty): string {
  return DIFFICULTY_BADGE_CLASS[difficulty];
}

const CATEGORY_BADGE_CLASS: Record<QuestionCategory, string> = {
  Technical: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  Behavioral: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
  Situational: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
};

export function getCategoryBadgeClass(category: QuestionCategory): string {
  return CATEGORY_BADGE_CLASS[category];
}

/**
 * Plain percentage-score badge (no accompanying level label) — used wherever
 * a bare "NN%" is shown (dashboard recent sessions, history rows, per-question scores).
 */
export function getScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300";
  if (score >= 65) return "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300";
  return "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300";
}

export interface ScoreLevelLabels {
  excellent: string;
  good: string;
  fair: string;
  needsWork: string;
}

/**
 * Single source of truth for the overall-score "level" badge: label and badge
 * color are derived from the same thresholds so they can never disagree.
 */
export function getScoreLevel(
  score: number,
  labels: ScoreLevelLabels,
): { label: string; badgeClass: string } {
  if (score >= 80) return { label: labels.excellent, badgeClass: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" };
  if (score >= 65) return { label: labels.good, badgeClass: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300" };
  if (score >= 50) return { label: labels.fair, badgeClass: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300" };
  return { label: labels.needsWork, badgeClass: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400" };
}
