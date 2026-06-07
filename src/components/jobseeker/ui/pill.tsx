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
  Easy: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard: "bg-red-50 text-red-600",
};

export function getDifficultyBadgeClass(difficulty: Difficulty): string {
  return DIFFICULTY_BADGE_CLASS[difficulty];
}

const CATEGORY_BADGE_CLASS: Record<QuestionCategory, string> = {
  Technical: "bg-blue-50 text-blue-700",
  Behavioral: "bg-violet-50 text-violet-700",
  Situational: "bg-amber-50 text-amber-700",
};

export function getCategoryBadgeClass(category: QuestionCategory): string {
  return CATEGORY_BADGE_CLASS[category];
}

/**
 * Plain percentage-score badge (no accompanying level label) — used wherever
 * a bare "NN%" is shown (dashboard recent sessions, history rows, per-question scores).
 */
export function getScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 65) return "bg-violet-50 text-violet-700";
  return "bg-amber-50 text-amber-700";
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
  if (score >= 80) return { label: labels.excellent, badgeClass: "bg-emerald-50 text-emerald-700" };
  if (score >= 65) return { label: labels.good, badgeClass: "bg-violet-50 text-violet-700" };
  if (score >= 50) return { label: labels.fair, badgeClass: "bg-amber-50 text-amber-700" };
  return { label: labels.needsWork, badgeClass: "bg-red-50 text-red-600" };
}
