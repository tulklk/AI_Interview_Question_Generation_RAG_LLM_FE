import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SignalLow, SignalMedium, SignalHigh, Code2, Users, Lightbulb, Layers, Puzzle, Network } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Difficulty, QuestionCategory } from "@/features/candidate/types/jobseeker";

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

const DIFFICULTY_ICON = {
  Easy: SignalLow,
  Medium: SignalMedium,
  Hard: SignalHigh,
} as const;

interface DifficultyPillProps {
  difficulty: Difficulty;
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Difficulty badge with a signal-strength icon (low/medium/high bars) so it reads at a glance. */
export function DifficultyPill({ difficulty, label, size = "md", className }: DifficultyPillProps) {
  const Icon = DIFFICULTY_ICON[difficulty];
  return (
    <Pill size={size} className={cn("inline-flex items-center gap-1", getDifficultyBadgeClass(difficulty), className)}>
      <Icon size={size === "sm" ? 10 : 11} className="shrink-0" />
      {label}
    </Pill>
  );
}

// The real API's questionType is open-ended (technical, behavioral, situational,
// problem-solving, system-design, ...). Known ones get a distinct color/icon;
// anything else falls back to a neutral style rather than crashing or mislabeling.
const CATEGORY_BADGE_CLASS: Record<string, string> = {
  technical: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  behavioral: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
  situational: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  "problem-solving": "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
  "system-design": "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
};
const CATEGORY_BADGE_FALLBACK = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300";

export function getCategoryBadgeClass(category: QuestionCategory): string {
  return CATEGORY_BADGE_CLASS[category.toLowerCase()] ?? CATEGORY_BADGE_FALLBACK;
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  technical: Code2,
  behavioral: Users,
  situational: Lightbulb,
  "problem-solving": Puzzle,
  "system-design": Network,
};
const CATEGORY_ICON_FALLBACK = Layers;

interface CategoryPillProps {
  category: QuestionCategory;
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Category badge with an icon (code / people / lightbulb / ...) — falls back to a generic icon for unknown types. */
export function CategoryPill({ category, label, size = "md", className }: CategoryPillProps) {
  const Icon = CATEGORY_ICON[category.toLowerCase()] ?? CATEGORY_ICON_FALLBACK;
  return (
    <Pill size={size} className={cn("inline-flex items-center gap-1", getCategoryBadgeClass(category), className)}>
      <Icon size={size === "sm" ? 10 : 11} className="shrink-0" />
      {label}
    </Pill>
  );
}

/** Turns a raw API category/questionType ("problem-solving") into a display label ("Problem Solving"). */
export function formatCategoryLabel(category: QuestionCategory): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
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
