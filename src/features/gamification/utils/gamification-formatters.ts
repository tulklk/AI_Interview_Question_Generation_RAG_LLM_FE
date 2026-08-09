/**
 * Pure formatting helpers for gamification UI.
 * No API calls, no state — safe to import anywhere.
 */

import type { DailyGoalPreset, XpRewardType } from "@/features/gamification/types/gamification.types";

/** Format raw XP number for display, e.g. 1200 → "1,200" */
export function formatXp(xp: number): string {
  return xp.toLocaleString();
}

/** Level badge label — deliberately avoids job-title framing */
export function getLevelLabel(level: number): string {
  if (level <= 2)  return "Newcomer";
  if (level <= 5)  return "Practitioner";
  if (level <= 9)  return "Achiever";
  if (level <= 14) return "Trailblazer";
  if (level <= 19) return "Specialist";
  if (level <= 29) return "Mentor";
  return "Legend";
}

/** Tailwind colour classes for each level tier */
export function getLevelColorClass(level: number): string {
  if (level <= 2)  return "text-gray-500 dark:text-gray-400";
  if (level <= 5)  return "text-emerald-600 dark:text-emerald-400";
  if (level <= 9)  return "text-sky-600 dark:text-sky-400";
  if (level <= 14) return "text-violet-600 dark:text-violet-400";
  if (level <= 19) return "text-amber-600 dark:text-amber-400";
  if (level <= 29) return "text-rose-600 dark:text-rose-400";
  return "text-yellow-500 dark:text-yellow-400";
}

/** Progress-bar accent colour for each level tier */
export function getLevelBarColor(level: number): string {
  if (level <= 2)  return "#6b7280";
  if (level <= 5)  return "#10b981";
  if (level <= 9)  return "#0ea5e9";
  if (level <= 14) return "#7c3aed";
  if (level <= 19) return "#d97706";
  if (level <= 29) return "#e11d48";
  return "#eab308";
}

/** Streak flame intensity (0–3) for colouring/sizing the streak icon */
export function streakIntensity(streak: number): 0 | 1 | 2 | 3 {
  if (streak === 0) return 0;
  if (streak < 3)  return 1;
  if (streak < 7)  return 2;
  return 3;
}

/** Human-readable label for an XpRewardType */
export function xpRewardTypeLabel(type: XpRewardType, locale: "vi" | "en" = "en"): string {
  const labels: Record<XpRewardType, Record<"vi" | "en", string>> = {
    QuestionCompleted:    { en: "Question completed",   vi: "Hoàn thành câu hỏi" },
    ScoreBonus:           { en: "Performance bonus",    vi: "Thưởng điểm số" },
    QuestionSetCompleted: { en: "Session completed",    vi: "Hoàn thành phiên" },
    ImprovementBonus:     { en: "Improvement bonus",    vi: "Thưởng cải thiện" },
    StreakMilestone:      { en: "Streak milestone",     vi: "Mốc luyện tập liên tiếp" },
    Achievement:          { en: "Achievement unlocked", vi: "Mở khóa thành tích" },
  };
  return labels[type]?.[locale] ?? type;
}

/** XP required to reach each level (index = level number) */
export const LEVEL_XP_TABLE: number[] = [
  0,     // Level 0 (unused)
  0,     // Level 1 — starting point
  100,   // Level 2
  250,   // Level 3
  450,   // Level 4
  700,   // Level 5
  1_000, // Level 6
  1_350, // Level 7
  1_750, // Level 8
  2_200, // Level 9
  2_700, // Level 10
];

/** Preset daily goal options */
export const DAILY_GOAL_PRESETS: { value: DailyGoalPreset; labelEn: string; labelVi: string }[] = [
  { value: 20,  labelEn: "Light (20 XP / day)",   labelVi: "Nhẹ (20 XP / ngày)" },
  { value: 50,  labelEn: "Steady (50 XP / day)",  labelVi: "Vừa phải (50 XP / ngày)" },
  { value: 80,  labelEn: "Active (80 XP / day)",  labelVi: "Chăm chỉ (80 XP / ngày)" },
  { value: 120, labelEn: "Intense (120 XP / day)", labelVi: "Cường độ cao (120 XP / ngày)" },
];

/** Relative time string e.g. "2 hours ago" */
export function timeAgo(isoString: string, locale: "vi" | "en" = "en"): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffM  = Math.floor(diffMs / 60_000);
  const diffH  = Math.floor(diffMs / 3_600_000);
  const diffD  = Math.floor(diffMs / 86_400_000);

  if (locale === "vi") {
    if (diffM < 1)  return "vừa xong";
    if (diffM < 60) return `${diffM} phút trước`;
    if (diffH < 24) return `${diffH} giờ trước`;
    if (diffD < 30) return `${diffD} ngày trước`;
    return `${Math.floor(diffD / 30)} tháng trước`;
  }

  if (diffM < 1)  return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;
  return `${Math.floor(diffD / 30)}mo ago`;
}
