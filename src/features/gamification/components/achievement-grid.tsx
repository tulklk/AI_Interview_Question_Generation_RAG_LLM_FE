"use client";

import { useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useAchievements } from "@/features/gamification/hooks/use-achievements";
import { AchievementCard } from "@/features/gamification/components/achievement-card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type {
  AchievementCategory,
  GamificationAchievement,
} from "@/features/gamification/types/gamification.types";

type FilterTab = "all" | AchievementCategory;

const FILTER_TABS: { key: FilterTab; labelEn: string; labelVi: string }[] = [
  { key: "all",         labelEn: "All",         labelVi: "Tất cả"    },
  { key: "practice",    labelEn: "Practice",    labelVi: "Luyện tập" },
  { key: "streak",      labelEn: "Streak",      labelVi: "Chuỗi ngày"},
  { key: "performance", labelEn: "Performance", labelVi: "Điểm số"   },
  { key: "consistency", labelEn: "Consistency", labelVi: "Kiên trì"  },
];

interface AchievementGridProps {
  /** "compact" = 2-col cards in a sidebar panel; "full" = filterable list */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Sort order:
 *   1. Recently unlocked (newest unlockedAt first)
 *   2. Other unlocked
 *   3. Locked with progress (highest % first)
 *   4. Locked without progress data
 */
function sortAchievements(
  list: GamificationAchievement[]
): GamificationAchievement[] {
  return [...list].sort((a, b) => {
    // Unlocked before locked
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    // Within unlocked: most recently unlocked first
    if (a.unlocked && b.unlocked) {
      const tA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const tB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return tB - tA;
    }
    // Within locked: highest progress % first; no data → last
    const pA =
      a.targetValue && a.currentValue !== undefined
        ? a.currentValue / a.targetValue
        : -1;
    const pB =
      b.targetValue && b.currentValue !== undefined
        ? b.currentValue / b.targetValue
        : -1;
    return pB - pA;
  });
}

export function AchievementGrid({ variant = "full", className }: AchievementGridProps) {
  const { lang, t } = useLanguage();
  const g = t.gamification;
  const { achievements, loading, error, refresh } = useAchievements();
  const [filter, setFilter] = useState<FilterTab>("all");

  const isVi = lang === "vi";
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // ID of the most recently unlocked achievement — gets the "Mới" badge
  const newestUnlockedId =
    achievements
      .filter((a) => a.unlocked && a.unlockedAt)
      .sort(
        (a, b) =>
          new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
      )[0]?.id ?? null;

  // ── Compact (profile sidebar) variant — 3-col icon tile grid ─────────────
  if (variant === "compact") {
    const sorted = sortAchievements(achievements);

    return (
      <div className={cn("hr-glass-card p-5 overflow-visible", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className={cn(
              "text-[14px] font-bold flex items-center gap-1.5",
              portalHeadingAlt
            )}
          >
            <Trophy size={13} className="text-amber-500 shrink-0" />
            {g.achievementsTitle}
          </h3>
          <span
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
              unlockedCount > 0
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                : "bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700"
            )}
          >
            {unlockedCount}/{achievements.length || "—"}
          </span>
        </div>

        {/* Content states */}
        {loading ? (
          /* Square skeleton tiles */
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full aspect-square rounded-2xl"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-5">
            <p className={cn("text-[12px] mb-3", portalSubtextAlt)}>
              {g.achievementsError}
            </p>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              <RefreshCw size={11} />
              {g.achievementsRetry}
            </button>
          </div>
        ) : achievements.length === 0 ? (
          <p className={cn("text-[12px] text-center py-4", portalSubtextAlt)}>
            {g.noAchievements}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {sorted.map((ach) => (
              <AchievementCard
                key={ach.id}
                achievement={ach}
                size="sm"
                isNewlyUnlocked={ach.id === newestUnlockedId}
              />
            ))}
          </div>
        )}

        {/* Footer count — only visible when loaded with data */}
        {!loading && !error && achievements.length > 0 && (
          <p className={cn("text-[10px] mt-3 text-center", portalSubtextAlt)}>
            {isVi
              ? `${unlockedCount}/${achievements.length} thành tích đã đạt được`
              : `${unlockedCount}/${achievements.length} achievements unlocked`}
          </p>
        )}
      </div>
    );
  }

  // ── Full variant (settings / achievements page) ────────────────────────────
  const filtered =
    filter === "all"
      ? achievements
      : achievements.filter((a) => a.category === filter);
  const sortedFull = sortAchievements(filtered);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className={cn(
            "text-[14px] font-bold flex items-center gap-1.5",
            portalHeadingAlt
          )}
        >
          <Trophy size={13} className="text-amber-500 shrink-0" />
          {g.achievementsTitle}
        </h3>
        <span className={cn("text-[12px] tabular-nums", portalSubtextAlt)}>
          {unlockedCount}/{achievements.length} {g.unlocked}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all",
              filter === tab.key
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
            )}
          >
            {isVi ? tab.labelVi : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Content states */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30"
            >
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-48" />
                <Skeleton className="h-1.5 w-36 rounded-full mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className={cn("text-[12px] mb-3", portalSubtextAlt)}>
            {g.achievementsError}
          </p>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
          >
            <RefreshCw size={11} />
            {g.achievementsRetry}
          </button>
        </div>
      ) : sortedFull.length === 0 ? (
        <p className={cn("text-[12px] text-center py-6", portalSubtextAlt)}>
          {g.noAchievements}
        </p>
      ) : (
        <div className="space-y-2">
          {sortedFull.map((ach) => (
            <AchievementCard
              key={ach.id}
              achievement={ach}
              size="md"
              isNewlyUnlocked={ach.id === newestUnlockedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
