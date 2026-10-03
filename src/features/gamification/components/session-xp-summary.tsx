"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { useLanguage } from "@/shared/providers/language-context";
import type { XpReward, XpRewardType } from "@/features/gamification/types/gamification.types";
import { XpProgressBar } from "@/features/gamification/components/xp-progress-bar";
import { xpRewardTypeLabel } from "@/features/gamification/utils/gamification-formatters";
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
  const { t, lang } = useLanguage();
  const g = t.gamification;
  const locale = lang === "vi" ? "vi" : "en";
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
      className={cn("hr-glass-card w-full overflow-hidden", className)}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-2.5 py-1 text-white">
          <Zap size={12} className="shrink-0" />
          <span className="text-[14px] font-[800] tabular-nums">+{xpReward.totalEarned}</span>
          <span className="text-[10px] font-semibold opacity-80">XP</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn("text-[12px] font-[700] leading-tight", portalHeadingAlt)}>
            {g.sessionSummaryTitle}
          </p>
          {hasLevelUp && (
            <p className="mt-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
              {g.sessionLevelUp.replace("{{level}}", String(xpReward.currentLevel))}
            </p>
          )}
        </div>

        {hasLevelUp && (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
            <TrendingUp size={10} />
            Lv{xpReward.currentLevel}
          </div>
        )}

        <ChevronDown
          size={14}
          aria-hidden
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

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
            <div className="space-y-1.5 border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
              {xpReward.rewards.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="shrink-0 text-sm">{REWARD_TYPE_ICONS[r.type]}</span>
                  <span className={cn("min-w-0 flex-1 text-[12px]", portalSubtextAlt)}>
                    {r.label || xpRewardTypeLabel(r.type, locale)}
                  </span>
                  <span className="text-[12px] font-[700] tabular-nums text-violet-600 dark:text-violet-400">
                    +{r.xp} XP
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 dark:border-gray-800">
                <span className={cn("text-[12px] font-semibold", portalSubtextAlt)}>Total</span>
                <span className="text-[13px] font-[800] tabular-nums text-violet-600 dark:text-violet-400">
                  +{xpReward.totalEarned} XP
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {progress && (
        <div className="border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <p className={cn("mb-1.5 flex items-center justify-between gap-2 text-[11px]", portalSubtextAlt)}>
            <span>{g.levelLabel} {progress.level}</span>
            <span className="tabular-nums">
              {progress.currentLevelXp.toLocaleString()} / {progress.xpRequiredForNextLevel.toLocaleString()} XP
            </span>
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
    </motion.div>
  );
}
