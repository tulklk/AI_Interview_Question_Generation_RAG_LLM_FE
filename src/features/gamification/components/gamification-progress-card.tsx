"use client";

import { useState } from "react";
import { HelpCircle, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useUserProgress } from "@/features/gamification/hooks/use-user-progress";
import { XpProgressBar } from "@/features/gamification/components/xp-progress-bar";
import { XpGuidePanel } from "@/features/gamification/components/xp-guide-panel";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  getLevelLabel,
  getLevelColorClass,
  formatXp,
  streakIntensity,
} from "@/features/gamification/utils/gamification-formatters";
import {
  portalHeadingAlt,
  portalSubtextAlt,
  portalIconWell,
} from "@/shared/utils/portal-ui";

interface GamificationProgressCardProps {
  className?: string;
}

// Streak emoji scales with intensity so it still communicates momentum
const STREAK_EMOJI: Record<0 | 1 | 2 | 3, string> = {
  0: "🕯️",
  1: "🔥",
  2: "🔥",
  3: "🔥",
};

export function GamificationProgressCard({ className }: GamificationProgressCardProps) {
  const { t } = useLanguage();
  const g = t.gamification;
  const { progress, loading } = useUserProgress();
  const [guideOpen, setGuideOpen] = useState(false);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || !progress) {
    return (
      <div
        className={cn("hr-glass-card p-5", className)}
        aria-busy="true"
        aria-label={g.ariaProgressCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3.5 w-28" />
        </div>

        {/* Level + XP row */}
        <div className="flex items-end justify-between mb-2">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>

        <Skeleton className="h-2 w-full rounded-full mb-3" />

        {/* Mini stat row */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(portalIconWell, "rounded-lg p-2 flex flex-col items-center gap-1")}>
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const intensity = streakIntensity(progress.currentStreak);
  const levelLabel = getLevelLabel(progress.level);
  const levelColor = getLevelColorClass(progress.level);
  const goalRemaining = Math.max(0, progress.dailyGoalXp - progress.todayXp);
  const goalPct = Math.min(100, Math.round((progress.todayXp / progress.dailyGoalXp) * 100));

  const miniStats = [
    {
      emoji: STREAK_EMOJI[intensity],
      value: String(progress.currentStreak),
      label: g.streakLabel,
      bg: intensity >= 2
        ? "bg-orange-50 dark:bg-orange-950/30"
        : "bg-gray-50 dark:bg-gray-800/40",
    },
    {
      emoji: "⚡",
      value: formatXp(progress.todayXp),
      label: "XP " + new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      emoji: "⭐",
      value: String(progress.totalPracticeSessions),
      label: g.totalSessions,
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  return (
    <div
      className={cn("hr-glass-card p-5", className)}
      aria-label={g.ariaProgressCard}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn("text-[13px] font-semibold flex items-center gap-1.5", portalSubtextAlt)}>
          <Zap size={12} className="text-violet-500 dark:text-violet-400 shrink-0" />
          {g.progressTitle}
        </h3>
        <button
          onClick={() => setGuideOpen(true)}
          aria-label={g.xpGuideBtn}
          title={g.xpGuideBtn}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            "text-gray-400 dark:text-gray-500",
            "hover:text-violet-600 dark:hover:text-violet-400",
            "hover:bg-violet-50 dark:hover:bg-violet-950/40",
            "transition-colors"
          )}
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* XP Guide Panel (portal-level drawer) */}
      <XpGuidePanel open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Level badge + XP total */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className={cn("text-[22px] font-extrabold leading-none tabular-nums", portalHeadingAlt)}>
            {g.levelLabel} {progress.level}
          </p>
          <p className={cn("text-[11px] mt-0.5", levelColor, "font-semibold")}>
            {levelLabel}
          </p>
        </div>

        {/* Total XP pill */}
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn("text-[11px]", portalSubtextAlt)}>{g.totalXp}</span>
          <span className={cn("text-[15px] font-bold tabular-nums", portalHeadingAlt)}>
            {formatXp(progress.totalXp)} XP
          </span>
        </div>
      </div>

      {/* XP progress bar */}
      <XpProgressBar
        level={progress.level}
        progressPercentage={progress.progressPercentage}
        currentLevelXp={progress.currentLevelXp}
        xpRequiredForNextLevel={progress.xpRequiredForNextLevel}
        className="mb-4"
        showLabels
        height="sm"
        animate
      />

      {/* Mini stat row */}
      <div className="grid grid-cols-3 gap-2">
        {miniStats.map((s) => (
          <div
            key={s.label}
            className={cn(s.bg, "rounded-lg p-2 text-center border border-transparent")}
          >
            <div className="flex justify-center mb-1">
              <span aria-hidden className="text-[18px] leading-none select-none">{s.emoji}</span>
            </div>
            <p className={cn("text-[14px] font-bold leading-none tabular-nums", portalHeadingAlt)}>
              {s.value}
            </p>
            <p className={cn("text-[10px] mt-0.5 leading-tight", portalSubtextAlt)}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily goal progress */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-[11px] font-semibold", portalSubtextAlt)}>
            {g.dailyGoalTitle}
          </span>
          <span className={cn("text-[11px] tabular-nums", portalSubtextAlt)}>
            {g.dailyGoalProgress
              .replace("{{current}}", String(progress.todayXp))
              .replace("{{goal}}", String(progress.dailyGoalXp))}
          </span>
        </div>

        {/* Thin goal bar */}
        <div className="relative h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 dark:bg-violet-400 transition-all duration-700"
            style={{ width: `${goalPct}%` }}
          />
        </div>

        <p className={cn("text-[10px] mt-1", portalSubtextAlt)}>
          {progress.dailyGoalCompleted
            ? g.dailyGoalCompleted
            : g.dailyGoalNotDone.replace("{{remaining}}", String(goalRemaining))}
        </p>
      </div>
    </div>
  );
}
