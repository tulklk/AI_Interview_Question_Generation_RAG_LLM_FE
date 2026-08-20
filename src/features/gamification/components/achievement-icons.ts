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
  /**
   * CSS class that triggers a hover animation on the icon / emoji element.
   * The class itself carries no styles; `.group:hover .ach-anim-*` rules
   * in ACH_ANIM_CSS start the animation on parent hover.
   * Apply ONLY when the achievement is unlocked — locked icons stay static.
   */
  animClass: string;
}

// ── Hover animation CSS ───────────────────────────────────────────────────────
// Premium, physics-staged animations: pre-wind → peak → damped settle.
// Each keyframe chain bakes in the spring / overshoot so timing-function can
// stay simple. drop-shadow glow is color-matched per achievement.
// Inject once via <style> in the grid; applied only to unlocked icons.
export const ACH_ANIM_CSS = `
  /* Trigger rules — idle by default, fire only on .group hover */
  .group:hover .ach-anim-rocket   {animation:kf-ach-rocket    1.9s ease-in-out infinite}
  .group:hover .ach-anim-fire     {animation:kf-ach-fire       0.82s ease-in-out infinite}
  .group:hover .ach-anim-star     {animation:kf-ach-star       1.15s ease-in-out infinite}
  .group:hover .ach-anim-target   {animation:kf-ach-target     1.0s  ease-in-out infinite}
  .group:hover .ach-anim-lightning{animation:kf-ach-lightning  0.58s ease-in-out infinite}
  .group:hover .ach-anim-globe    {animation:kf-ach-globe      2.4s  linear      infinite}
  .group:hover .ach-anim-calendar {animation:kf-ach-calendar   1.0s  ease-in-out infinite}
  .group:hover .ach-anim-trophy   {animation:kf-ach-trophy     1.5s  ease-in-out infinite}

  /* ─────────────────────────────────────────────────────────────── */
  /* 🚀 Rocket — pre-launch vibration → ignition flash → blast-off arc → return */
  @keyframes kf-ach-rocket{
    0%   {transform:translate(0,0)rotate(0deg)scale(1);
          filter:brightness(1)}
    4%   {transform:translate(-1px,1px)rotate(-3deg)scale(1.02)}
    8%   {transform:translate(1px,-1px)rotate(3deg)scale(1.02)}
    12%  {transform:translate(-1px,0)rotate(-2deg)scale(0.97)}
    16%  {transform:translate(0,0)rotate(0deg)scale(0.88);
          filter:brightness(2.4)drop-shadow(0 4px 12px rgba(251,146,60,.95))}
    38%  {transform:translate(9px,-20px)rotate(-29deg)scale(0.78);
          filter:brightness(3.0)drop-shadow(0 7px 18px rgba(239,68,68,.85))}
    58%  {transform:translate(14px,-30px)rotate(-35deg)scale(0.65);
          filter:brightness(2.0)drop-shadow(0 10px 22px rgba(251,146,60,.6))}
    76%  {transform:translate(6px,-12px)rotate(-18deg)scale(0.84);
          filter:brightness(1.35)drop-shadow(0 4px 9px rgba(251,146,60,.3))}
    91%  {transform:translate(1px,-2px)rotate(-4deg)scale(0.98);
          filter:brightness(1.05)}
    100% {transform:translate(0,0)rotate(0deg)scale(1);
          filter:brightness(1)}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* 🔥 Fire — heat-shimmer: scaleY+skewX flicker with warm orange glow trail */
  @keyframes kf-ach-fire{
    0%,100%{transform:scale(1,1)skewX(0);
            filter:brightness(1)}
    9%  {transform:scale(0.85,1.26)skewX(-4deg);
         filter:brightness(1.6)drop-shadow(0 -6px 12px rgba(251,146,60,.9))}
    20% {transform:scale(1.11,0.87)skewX(5deg);
         filter:brightness(1.9)drop-shadow(0 -3px 14px rgba(239,68,68,.8))}
    32% {transform:scale(0.80,1.32)skewX(-6deg);
         filter:brightness(2.2)drop-shadow(0 -8px 16px rgba(251,146,60,1))}
    44% {transform:scale(1.09,0.84)skewX(4deg);
         filter:brightness(1.8)drop-shadow(0 -4px 12px rgba(239,68,68,.7))}
    57% {transform:scale(0.87,1.22)skewX(-4deg);
         filter:brightness(2.0)drop-shadow(0 -7px 14px rgba(251,146,60,.9))}
    69% {transform:scale(1.06,0.90)skewX(3deg);
         filter:brightness(1.6)drop-shadow(0 -3px 9px rgba(239,68,68,.55))}
    82% {transform:scale(0.93,1.10)skewX(-2deg);
         filter:brightness(1.3)drop-shadow(0 -3px 7px rgba(251,146,60,.35))}
    93% {transform:scale(1.02,0.97)skewX(1deg);
         filter:brightness(1.1)}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* ⭐ Star — paired sparkle bursts: spin + radiant gold glow flash */
  @keyframes kf-ach-star{
    0%,100%{transform:scale(1)rotate(0deg);
            filter:brightness(1)drop-shadow(0 0 0 rgba(251,191,36,0))}
    10% {transform:scale(1.45)rotate(16deg);
         filter:brightness(2.6)drop-shadow(0 0 16px rgba(251,191,36,1))}
    26% {transform:scale(0.86)rotate(38deg);
         filter:brightness(1.4)drop-shadow(0 0 5px rgba(251,191,36,.45))}
    46% {transform:scale(1.42)rotate(56deg);
         filter:brightness(2.8)drop-shadow(0 0 20px rgba(251,191,36,1))}
    63% {transform:scale(0.84)rotate(74deg);
         filter:brightness(1.3)drop-shadow(0 0 3px rgba(251,191,36,.35))}
    79% {transform:scale(1.20)rotate(74deg);
         filter:brightness(2.0)drop-shadow(0 0 12px rgba(251,191,36,.85))}
    93% {transform:scale(1.03)rotate(74deg);
         filter:brightness(1.1)drop-shadow(0 0 3px rgba(251,191,36,.2))}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* 🎯 Target — approach tremble → dart-impact compress → spring-out ring */
  @keyframes kf-ach-target{
    0%,100%{transform:scale(1)translateX(0);
            filter:brightness(1)}
    5%  {transform:scale(1.04)translateX(-2px)}
    10% {transform:scale(1.04)translateX(2px)}
    16% {transform:scale(1.04)translateX(-1.5px)}
    22% {transform:scale(0.66)translateX(0);
         filter:brightness(2.4)drop-shadow(0 0 14px rgba(139,92,246,.98))}
    38% {transform:scale(1.55)translateX(0);
         filter:brightness(2.0)drop-shadow(0 0 20px rgba(139,92,246,.78))}
    52% {transform:scale(0.84)translateX(0);
         filter:brightness(1.5)drop-shadow(0 0 10px rgba(139,92,246,.5))}
    64% {transform:scale(1.18)translateX(0);
         filter:brightness(1.7)drop-shadow(0 0 7px rgba(139,92,246,.4))}
    76% {transform:scale(0.94)translateX(0);
         filter:brightness(1.15)}
    88% {transform:scale(1.05)translateX(0)}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* ⚡ Lightning — electric discharge: chaotic jitter + plasma white-blue glow */
  @keyframes kf-ach-lightning{
    0%,100%{transform:translate(0,0)scale(1);
            filter:brightness(1)}
    6%  {transform:translate(-5px,-2px)scale(1.20);
         filter:brightness(3.8)drop-shadow(0 0 14px rgba(56,189,248,1))}
    12% {transform:translate(6px,3px)scale(1.34);
         filter:brightness(4.5)drop-shadow(0 0 20px rgba(186,230,253,.98))}
    19% {transform:translate(-5px,3px)scale(1.25);
         filter:brightness(3.2)drop-shadow(0 0 16px rgba(56,189,248,.88))}
    26% {transform:translate(6px,-3px)scale(1.30);
         filter:brightness(3.8)drop-shadow(0 0 18px rgba(56,189,248,.82))}
    33% {transform:translate(-3px,2px)scale(1.16);
         filter:brightness(2.4)drop-shadow(0 0 11px rgba(56,189,248,.6))}
    46% {transform:translate(2px,-1px)scale(1.08);
         filter:brightness(1.7)drop-shadow(0 0 6px rgba(56,189,248,.38))}
    62% {transform:translate(0,0)scale(1.03);
         filter:brightness(1.25)}
    78% {filter:brightness(1.08)}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* 🌐 Globe — atmospheric orbit: smooth rotation + pulsing indigo glow */
  @keyframes kf-ach-globe{
    0%   {transform:rotate(0deg)scale(1);
          filter:brightness(1)drop-shadow(0 0 0 rgba(99,102,241,0))}
    25%  {filter:brightness(1.45)drop-shadow(0 0 10px rgba(99,102,241,.7))}
    50%  {transform:rotate(180deg)scale(1.12);
          filter:brightness(1.75)drop-shadow(0 0 18px rgba(99,102,241,.92))}
    75%  {filter:brightness(1.45)drop-shadow(0 0 10px rgba(99,102,241,.7))}
    100% {transform:rotate(360deg)scale(1);
          filter:brightness(1)drop-shadow(0 0 0 rgba(99,102,241,0))}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* 📅 Calendar — spring check-bounce: high arc + overshoot settle + emerald glow */
  @keyframes kf-ach-calendar{
    0%,100%{transform:translateY(0)scale(1);
            filter:brightness(1)}
    18% {transform:translateY(-12px)scale(1.18);
         filter:brightness(1.9)drop-shadow(0 10px 16px rgba(52,211,153,.85))}
    32% {transform:translateY(-3px)scale(1.04);
         filter:brightness(1.4)drop-shadow(0 4px 8px rgba(52,211,153,.5))}
    48% {transform:translateY(-9px)scale(1.12);
         filter:brightness(1.7)drop-shadow(0 8px 14px rgba(52,211,153,.72))}
    62% {transform:translateY(-2px)scale(1.03);
         filter:brightness(1.25)drop-shadow(0 2px 5px rgba(52,211,153,.32))}
    76% {transform:translateY(-6px)scale(1.07);
         filter:brightness(1.5)drop-shadow(0 5px 10px rgba(52,211,153,.55))}
    90% {transform:translateY(-1px)scale(1.01);
         filter:brightness(1.1)}
  }

  /* ─────────────────────────────────────────────────────────────── */
  /* 🏆 Trophy — victory shimmer: wide→narrow wiggle + golden glow cascade */
  @keyframes kf-ach-trophy{
    0%,100%{transform:rotate(0deg)scale(1);
            filter:brightness(1)}
    6%  {transform:rotate(-15deg)scale(1.10);
         filter:brightness(1.7)drop-shadow(0 4px 14px rgba(251,191,36,.85))}
    14% {transform:rotate(15deg)scale(1.20);
         filter:brightness(2.3)drop-shadow(0 5px 20px rgba(251,191,36,1))}
    22% {transform:rotate(-12deg)scale(1.18);
         filter:brightness(2.1)drop-shadow(0 4px 16px rgba(251,191,36,.92))}
    30% {transform:rotate(11deg)scale(1.14);
         filter:brightness(1.9)drop-shadow(0 3px 13px rgba(251,191,36,.78))}
    38% {transform:rotate(-8deg)scale(1.10);
         filter:brightness(1.65)drop-shadow(0 3px 10px rgba(251,191,36,.64))}
    46% {transform:rotate(7deg)scale(1.07);
         filter:brightness(1.5)drop-shadow(0 2px 8px rgba(251,191,36,.52))}
    54% {transform:rotate(-5deg)scale(1.04);
         filter:brightness(1.35)drop-shadow(0 2px 6px rgba(251,191,36,.38))}
    62% {transform:rotate(3deg)scale(1.03);
         filter:brightness(1.22)drop-shadow(0 1px 4px rgba(251,191,36,.24))}
    72% {transform:rotate(-2deg)scale(1.01);
         filter:brightness(1.1)}
    84% {transform:rotate(1deg)scale(1.005)}
  }

  /* Respect reduced-motion */
  @media(prefers-reduced-motion:reduce){
    .group:hover .ach-anim-rocket,
    .group:hover .ach-anim-fire,
    .group:hover .ach-anim-star,
    .group:hover .ach-anim-target,
    .group:hover .ach-anim-lightning,
    .group:hover .ach-anim-globe,
    .group:hover .ach-anim-calendar,
    .group:hover .ach-anim-trophy{animation:none}
  }
`;

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
    animClass: "ach-anim-rocket",
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
    animClass: "ach-anim-fire",
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
    animClass: "ach-anim-star",
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
    animClass: "ach-anim-target",
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
    animClass: "ach-anim-lightning",
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
    animClass: "ach-anim-globe",
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
    animClass: "ach-anim-calendar",
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
    animClass: "ach-anim-trophy",
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
  animClass: "",
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
