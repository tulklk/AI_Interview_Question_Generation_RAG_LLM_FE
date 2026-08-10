/**
 * achievement-icons.ts
 *
 * Centralized mapping of achievement code → Lucide icon + colour palette.
 * Used by AchievementCard so every card gets a unique, meaningful icon rather
 * than a generic category icon, while all presentation logic stays in one place.
 */

import {
  Rocket,
  Flame,
  Star,
  Target,
  Code2,
  Network,
  CalendarCheck,
  Trophy,
  Medal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AchievementVisual {
  /** Lucide icon component (used in full/list variant) */
  Icon: LucideIcon;
  /** Emoji used in the compact 3-col tile — naturally colourful + filled */
  emoji: string;
  /** Tailwind classes: icon-well background (light + dark) */
  bgClass: string;
  /** Tailwind classes: icon colour (light + dark) */
  colorClass: string;
  /** Tailwind class: progress-bar fill colour */
  barClass: string;
  /** Tailwind classes: card background when unlocked (full/list variant) */
  unlockedBg: string;
  /** Tailwind classes: card border when unlocked (full/list variant) */
  unlockedBorder: string;
  /** Tailwind gradient for the compact tile background when unlocked */
  gradientClass: string;
}

const MAP: Record<string, AchievementVisual> = {
  FIRST_STEP: {
    Icon: Rocket,
    emoji: "🚀",
    bgClass: "bg-blue-100 dark:bg-blue-950/50",
    colorClass: "text-blue-600 dark:text-blue-400",
    barClass: "bg-blue-500",
    unlockedBg: "bg-blue-50/80 dark:bg-blue-950/20",
    unlockedBorder: "border-blue-200 dark:border-blue-800/40",
    gradientClass: "bg-gradient-to-br from-blue-500 to-blue-700",
  },
  ON_FIRE: {
    Icon: Flame,
    emoji: "🔥",
    bgClass: "bg-orange-100 dark:bg-orange-950/50",
    colorClass: "text-orange-500 dark:text-orange-400",
    barClass: "bg-orange-500",
    unlockedBg: "bg-orange-50/80 dark:bg-orange-950/20",
    unlockedBorder: "border-orange-200 dark:border-orange-800/40",
    gradientClass: "bg-gradient-to-br from-orange-500 to-red-600",
  },
  EXCELLENT_ANSWER: {
    Icon: Star,
    emoji: "⭐",
    bgClass: "bg-amber-100 dark:bg-amber-950/50",
    colorClass: "text-amber-500 dark:text-amber-400",
    barClass: "bg-amber-500",
    unlockedBg: "bg-amber-50/80 dark:bg-amber-950/20",
    unlockedBorder: "border-amber-200 dark:border-amber-800/40",
    gradientClass: "bg-gradient-to-br from-amber-400 to-orange-500",
  },
  DEDICATED: {
    Icon: Target,
    emoji: "🎯",
    bgClass: "bg-violet-100 dark:bg-violet-950/50",
    colorClass: "text-violet-600 dark:text-violet-400",
    barClass: "bg-violet-500",
    unlockedBg: "bg-violet-50/80 dark:bg-violet-950/20",
    unlockedBorder: "border-violet-200 dark:border-violet-800/40",
    gradientClass: "bg-gradient-to-br from-violet-500 to-purple-700",
  },
  TECHNICAL_MIND: {
    Icon: Code2,
    emoji: "⚡",
    bgClass: "bg-sky-100 dark:bg-sky-950/50",
    colorClass: "text-sky-600 dark:text-sky-400",
    barClass: "bg-sky-500",
    unlockedBg: "bg-sky-50/80 dark:bg-sky-950/20",
    unlockedBorder: "border-sky-200 dark:border-sky-800/40",
    gradientClass: "bg-gradient-to-br from-sky-500 to-blue-600",
  },
  SYSTEM_THINKER: {
    Icon: Network,
    emoji: "🌐",
    bgClass: "bg-indigo-100 dark:bg-indigo-950/50",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    barClass: "bg-indigo-500",
    unlockedBg: "bg-indigo-50/80 dark:bg-indigo-950/20",
    unlockedBorder: "border-indigo-200 dark:border-indigo-800/40",
    gradientClass: "bg-gradient-to-br from-indigo-500 to-violet-700",
  },
  CONSISTENCY: {
    Icon: CalendarCheck,
    emoji: "📅",
    bgClass: "bg-emerald-100 dark:bg-emerald-950/50",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    barClass: "bg-emerald-500",
    unlockedBg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    unlockedBorder: "border-emerald-200 dark:border-emerald-800/40",
    gradientClass: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  INTERVIEW_VETERAN: {
    Icon: Trophy,
    emoji: "🏆",
    bgClass: "bg-rose-100 dark:bg-rose-950/50",
    colorClass: "text-rose-500 dark:text-rose-400",
    barClass: "bg-rose-500",
    unlockedBg: "bg-rose-50/80 dark:bg-rose-950/20",
    unlockedBorder: "border-rose-200 dark:border-rose-800/40",
    gradientClass: "bg-gradient-to-br from-rose-500 to-pink-700",
  },
};

const FALLBACK: AchievementVisual = {
  Icon: Medal,
  emoji: "🏅",
  bgClass: "bg-gray-100 dark:bg-gray-800/60",
  colorClass: "text-gray-500 dark:text-gray-400",
  barClass: "bg-gray-400 dark:bg-gray-500",
  unlockedBg: "bg-gray-50/80 dark:bg-gray-800/20",
  unlockedBorder: "border-gray-200 dark:border-gray-700/40",
  gradientClass: "bg-gradient-to-br from-gray-500 to-gray-700",
};

/**
 * Returns the visual config (icon + colours) for a given achievement code.
 * Falls back to a neutral Medal icon if the code is unknown.
 */
export function getAchievementVisual(code: string): AchievementVisual {
  return MAP[code] ?? FALLBACK;
}

// ── Name + description fallbacks ──────────────────────────────────────────────
// Used when the backend omits or returns an empty name / description field.
// Keeps display-text and visual config co-located so adding a new achievement
// only requires changes in this one file.

interface AchievementLabel {
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
}

const LABELS: Record<string, AchievementLabel> = {
  FIRST_STEP: {
    nameVi: "Bước đầu tiên",
    nameEn: "First Step",
    descVi: "Hoàn thành 1 phiên đầu tiên.",
    descEn: "Finish your first session.",
  },
  ON_FIRE: {
    nameVi: "Bùng cháy",
    nameEn: "On Fire",
    descVi: "Chuỗi 7 ngày liên tiếp.",
    descEn: "7-day practice streak.",
  },
  EXCELLENT_ANSWER: {
    nameVi: "Câu trả lời xuất sắc",
    nameEn: "Excellent Answer",
    descVi: "≥ 90 điểm trong một câu hỏi.",
    descEn: "Score ≥ 90 on one question.",
  },
  DEDICATED: {
    nameVi: "Người luyện tập chăm chỉ",
    nameEn: "Dedicated",
    descVi: "Trả lời 100 câu hỏi.",
    descEn: "Answer 100 questions.",
  },
  TECHNICAL_MIND: {
    nameVi: "Tư duy kỹ thuật",
    nameEn: "Technical Mind",
    descVi: "50 câu hỏi kỹ thuật.",
    descEn: "50 technical questions.",
  },
  SYSTEM_THINKER: {
    nameVi: "Tư duy hệ thống",
    nameEn: "System Thinker",
    descVi: "30 câu Thiết kế hệ thống.",
    descEn: "30 System Design questions.",
  },
  CONSISTENCY: {
    nameVi: "Bền bỉ mỗi ngày",
    nameEn: "Consistency",
    descVi: "Đạt mục tiêu 10 ngày khác nhau.",
    descEn: "Daily goal on 10 different days.",
  },
  INTERVIEW_VETERAN: {
    nameVi: "Cựu binh phỏng vấn",
    nameEn: "Interview Veteran",
    descVi: "100 phiên luyện tập.",
    descEn: "Complete 100 sessions.",
  },
};

/**
 * Returns localised name + description for an achievement code.
 * Prioritise backend-supplied text; use these strings only when the backend
 * returns an empty / missing value.
 */
export function getAchievementLabel(
  code: string,
  lang: string
): { name: string; desc: string } {
  const label = LABELS[code];
  if (!label) return { name: "", desc: "" };
  return lang === "vi"
    ? { name: label.nameVi, desc: label.descVi }
    : { name: label.nameEn, desc: label.descEn };
}
