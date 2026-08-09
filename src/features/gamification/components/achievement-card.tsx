"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { GamificationAchievement } from "@/features/gamification/types/gamification.types";
import { portalHeadingAlt, portalSubtextAlt, portalIconWell } from "@/shared/utils/portal-ui";

interface AchievementCardProps {
  achievement: GamificationAchievement;
  size?: "sm" | "md";
}

export function AchievementCard({ achievement: ach, size = "md" }: AchievementCardProps) {
  const { t } = useLanguage();
  const g = t.gamification;

  const progressPct =
    !ach.unlocked && ach.targetValue && ach.currentValue !== undefined
      ? Math.min(100, Math.round((ach.currentValue / ach.targetValue) * 100))
      : 0;

  const ariaLabel = ach.unlocked
    ? g.ariaAchievementUnlocked.replace("{{name}}", ach.name)
    : g.ariaAchievementLocked
        .replace("{{name}}", ach.name)
        .replace("{{current}}", String(ach.currentValue ?? 0))
        .replace("{{target}}", String(ach.targetValue ?? "?"));

  if (size === "sm") {
    return (
      <div
        title={ach.description}
        aria-label={ariaLabel}
        className={cn(
          "flex flex-col items-center text-center p-2 rounded-lg transition-all",
          ach.unlocked
            ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800/30"
            : cn(portalIconWell, "opacity-50 grayscale")
        )}
      >
        <span className="text-2xl leading-none mb-1">{ach.icon ?? "🏅"}</span>
        <p className={cn("text-[10px] font-[600] leading-tight", portalHeadingAlt)}>
          {ach.name}
        </p>
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl transition-all border",
        ach.unlocked
          ? "bg-violet-50/60 dark:bg-violet-950/20 border-violet-100 dark:border-violet-800/30"
          : "bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800/40 opacity-70"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl",
          ach.unlocked
            ? "bg-white dark:bg-gray-900/60 shadow-sm"
            : "bg-gray-100 dark:bg-gray-800/60 grayscale"
        )}
      >
        {ach.unlocked ? (ach.icon ?? "🏅") : <Lock size={16} className="text-gray-400" />}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn("text-[12px] font-[700] leading-tight", portalHeadingAlt)}>
            {ach.name}
          </p>
          {ach.xpReward && ach.unlocked && (
            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-800/30">
              +{ach.xpReward} XP
            </span>
          )}
        </div>
        <p className={cn("text-[11px] mt-0.5 leading-snug", portalSubtextAlt)}>
          {ach.description}
        </p>

        {/* Progress bar for locked achievements */}
        {!ach.unlocked && ach.targetValue !== undefined && ach.currentValue !== undefined && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">
                {g.achievementProgress
                  .replace("{{current}}", String(ach.currentValue))
                  .replace("{{target}}", String(ach.targetValue))}
              </span>
              <span className="text-[10px] text-gray-400">{progressPct}%</span>
            </div>
            <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-400 dark:bg-gray-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Unlocked date */}
        {ach.unlocked && ach.unlockedAt && (
          <p className={cn("text-[10px] mt-1", portalSubtextAlt)}>
            {g.unlockedOn.replace("{{date}}", new Date(ach.unlockedAt).toLocaleDateString())}
          </p>
        )}
      </div>
    </div>
  );
}
