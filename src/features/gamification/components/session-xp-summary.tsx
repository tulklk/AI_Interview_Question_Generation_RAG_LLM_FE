"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { useLanguage } from "@/shared/providers/language-context";
import type { XpReward, XpRewardType } from "@/features/gamification/types/gamification.types";
import { XpProgressBar } from "@/features/gamification/components/xp-progress-bar";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

const REWARD_TYPE_ICONS: Record<XpRewardType, string> = {
  QuestionCompleted:    "✅",
  ScoreBonus:           "⭐",
  QuestionSetCompleted: "🎯",
  ImprovementBonus:     "📈",
  StreakMilestone:      "🔥",
  Achievement:          "🏆",
};

interface SessionXpSummaryProps {
  xpReward: XpReward;
  className?: string;
}

export function SessionXpSummary({ xpReward, className }: SessionXpSummaryProps) {
  const { t } = useLanguage();
  const g = t.gamification;
  const [expanded, setExpanded] = useState(false);

  if (xpReward.totalEarned === 0) {
    return (
      <div className={cn("hr-glass-card p-4 flex items-center gap-3", className)}>
        <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
          <Zap size={15} className="text-violet-500 dark:text-violet-400" />
        </div>
        <p className={cn("text-[12px]", portalSubtextAlt)}>{g.sessionNoXp}</p>
      </div>
    );
  }

  const hasLevelUp = xpReward.levelUp;
  const progress = xpReward.progress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("hr-glass-card overflow-hidden", className)}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* XP pill */}
        <div className="shrink-0 flex items-center gap-1.5 bg-violet-600 text-white rounded-xl px-3 py-1.5">
          <Zap size={13} className="shrink-0" />
          <span className="text-[15px] font-[800] tabular-nums">
            +{xpReward.totalEarned}
          </span>
          <span className="text-[11px] font-semibold opacity-80">XP</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("text-[13px] font-[700] leading-tight", portalHeadingAlt)}>
            {g.sessionSummaryTitle}
          </p>
          {hasLevelUp && (
            <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
              {g.sessionLevelUp.replace("{{level}}", String(xpReward.currentLevel))}
            </p>
          )}
        </div>

        {/* Level up badge */}
        {hasLevelUp && (
          <div className="shrink-0 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/40">
            <TrendingUp size={11} />
            Lv{xpReward.currentLevel}
          </div>
        )}

        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expandable breakdown */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="xp-breakdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
              {/* Reward breakdown rows */}
              {xpReward.rewards.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base shrink-0">{REWARD_TYPE_ICONS[r.type]}</span>
                  <span className={cn("flex-1 text-[12px]", portalSubtextAlt)}>{r.label}</span>
                  <span className={cn("text-[12px] font-[700] tabular-nums text-violet-600 dark:text-violet-400")}>
                    +{r.xp} XP
                  </span>
                </div>
              ))}

              {/* Divider + total */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className={cn("text-[12px] font-semibold", portalSubtextAlt)}>Total</span>
                <span className={cn("text-[13px] font-[800] tabular-nums text-violet-600 dark:text-violet-400")}>
                  +{xpReward.totalEarned} XP
                </span>
              </div>

              {/* Progress toward next level */}
              {progress && (
                <div className="pt-1">
                  <p className={cn("text-[11px] mb-1.5", portalSubtextAlt)}>
                    {g.levelLabel} {progress.level} · {progress.currentLevelXp.toLocaleString()} / {progress.xpRequiredForNextLevel.toLocaleString()} XP
                  </p>
                  <XpProgressBar
                    level={progress.level}
                    progressPercentage={progress.progressPercentage}
                    currentLevelXp={progress.currentLevelXp}
                    xpRequiredForNextLevel={progress.xpRequiredForNextLevel}
                    showLabels={false}
                    height="xs"
                    animate
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
