"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useAchievements } from "@/features/gamification/hooks/use-achievements";
import { AchievementCard } from "@/features/gamification/components/achievement-card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { AchievementCategory } from "@/features/gamification/types/gamification.types";

type FilterTab = "all" | AchievementCategory;

const FILTER_TABS: { key: FilterTab; labelEn: string; labelVi: string }[] = [
  { key: "all",         labelEn: "All",          labelVi: "Tất cả" },
  { key: "practice",    labelEn: "Practice",      labelVi: "Luyện tập" },
  { key: "streak",      labelEn: "Streak",        labelVi: "Chuỗi ngày" },
  { key: "performance", labelEn: "Performance",   labelVi: "Điểm số" },
  { key: "consistency", labelEn: "Consistency",   labelVi: "Kiên trì" },
];

interface AchievementGridProps {
  /** "compact" = 3-col small icons (profile sidebar); "full" = card list with detail */
  variant?: "compact" | "full";
  className?: string;
}

export function AchievementGrid({ variant = "full", className }: AchievementGridProps) {
  const { lang, t } = useLanguage();
  const g = t.gamification;
  const { achievements, loading } = useAchievements();
  const [filter, setFilter] = useState<FilterTab>("all");

  const isVi = lang === "vi";

  const filtered =
    filter === "all"
      ? achievements
      : achievements.filter((a) => a.category === filter);

  const unlocked = achievements.filter((a) => a.unlocked).length;

  // ── Compact (sidebar) variant ─────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <div className={cn("hr-glass-card p-5", className)}>
        <h3 className={cn("text-[14px] font-[700] mb-4 flex items-center gap-1.5", portalHeadingAlt)}>
          <Trophy size={13} className="text-amber-500 shrink-0" />
          {g.achievementsTitle}
        </h3>

        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {achievements.map((ach) => (
                <AchievementCard key={ach.id} achievement={ach} size="sm" />
              ))}
            </div>
            <p className={cn("text-[11px] mt-3 text-center", portalSubtextAlt)}>
              {unlocked}/{achievements.length} {g.unlocked}
            </p>
          </>
        )}
      </div>
    );
  }

  // ── Full variant ──────────────────────────────────────────────────────────
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn("text-[14px] font-[700] flex items-center gap-1.5", portalHeadingAlt)}>
          <Trophy size={13} className="text-amber-500 shrink-0" />
          {g.achievementsTitle}
        </h3>
        <span className={cn("text-[12px] tabular-nums", portalSubtextAlt)}>
          {unlocked}/{achievements.length} {g.unlocked}
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

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className={cn("text-[12px] text-center py-6", portalSubtextAlt)}>
          {g.noAchievements}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Unlocked first */}
          {[...filtered]
            .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
            .map((ach) => (
              <AchievementCard key={ach.id} achievement={ach} size="md" />
            ))}
        </div>
      )}
    </div>
  );
}
