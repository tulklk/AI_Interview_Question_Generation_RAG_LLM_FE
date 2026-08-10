"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  Star,
  CheckCircle2,
  TrendingUp,
  Flame,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getXpHistory } from "@/features/gamification/api/gamification-api";
import { timeAgo } from "@/features/gamification/utils/gamification-formatters";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  portalHeadingAlt,
  portalIconWell,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import type {
  XpHistoryEntry,
  XpRewardType,
} from "@/features/gamification/types/gamification.types";

// ── Snapshot helpers ───────────────────────────────────────────────────────────
// Mirror of the pattern used for gamification-progress-snapshot.
// practice-session.tsx writes this key when /complete returns XP rewards;
// we read it here so history is visible immediately even if the backend's
// /xp-history endpoint hasn't been updated yet.

const HISTORY_SNAPSHOT_KEY = "gamification-xp-history-snapshot";
const HISTORY_SNAPSHOT_TTL_MS = 10 * 60 * 1000; // 10 min

function readHistorySnapshot(): XpHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HISTORY_SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { entries: XpHistoryEntry[]; ts: number };
    if (!parsed.entries?.length || Date.now() - parsed.ts > HISTORY_SNAPSHOT_TTL_MS) {
      window.sessionStorage.removeItem(HISTORY_SNAPSHOT_KEY);
      return [];
    }
    return parsed.entries;
  } catch {
    return [];
  }
}

function clearHistorySnapshot() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(HISTORY_SNAPSHOT_KEY);
  }
}

// ── Type icon ─────────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: XpRewardType }) {
  switch (type) {
    case "QuestionCompleted":
      return <Zap size={13} className="text-sky-500" />;
    case "ScoreBonus":
      return <Star size={13} className="text-amber-500" />;
    case "QuestionSetCompleted":
      return <CheckCircle2 size={13} className="text-emerald-500" />;
    case "ImprovementBonus":
      return <TrendingUp size={13} className="text-violet-500" />;
    case "StreakMilestone":
      return <Flame size={13} className="text-orange-500" />;
    case "Achievement":
      return <Trophy size={13} className="text-yellow-500" />;
    default:
      return <Zap size={13} className="text-gray-400" />;
  }
}

// ── XpHistorySection ──────────────────────────────────────────────────────────

interface XpHistorySectionProps {
  /**
   * When true, renders without the outer card wrapper and title.
   * Used when embedding inside an existing panel (e.g. settings page tab).
   */
  embedded?: boolean;
}

export function XpHistorySection({ embedded = false }: XpHistorySectionProps) {
  const { lang, t } = useLanguage();
  const g = t.gamification;

  // Seed immediately from snapshot so the section never shows a spinner or
  // empty state right after a session completes.
  const [entries, setEntries] = useState<XpHistoryEntry[]>(() => readHistorySnapshot());
  const [loading, setLoading] = useState(true);

  // Load more entries when rendered in the dedicated settings tab
  const fetchLimit = embedded ? 30 : 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getXpHistory(1, fetchLimit)
      .then(({ items }) => {
        if (!cancelled) {
          setEntries((prev) => {
            if (items.length > 0) {
              // Backend has data — clear snapshot; use real entries.
              clearHistorySnapshot();
              return items;
            }
            // Backend not updated yet — keep snapshot entries if we have them.
            return prev.length > 0 ? prev : [];
          });
        }
      })
      .catch(() => {
        /* silently keep snapshot entries on error — non-critical section */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback label when backend / snapshot don't supply one
  function resolveLabel(entry: XpHistoryEntry): string {
    if (entry.label) return entry.label;
    switch (entry.type) {
      case "QuestionCompleted":    return g.rewardQuestionCompleted;
      case "ScoreBonus":           return g.rewardScoreBonus;
      case "QuestionSetCompleted": return g.rewardQuestionSetCompleted;
      case "ImprovementBonus":     return g.rewardImprovementBonus;
      case "StreakMilestone":      return g.rewardStreakMilestone;
      case "Achievement":          return g.rewardAchievement;
      default:                     return g.rewardQuestionCompleted;
    }
  }

  // Show skeleton only when still loading AND no snapshot data to display
  const showSkeleton = loading && entries.length === 0;

  // ── Shared list content ───────────────────────────────────────────────────
  const listContent = showSkeleton ? (
    <div className="space-y-2">
      {Array.from({ length: embedded ? 8 : 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-2.5 w-10 rounded" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      ))}
    </div>
  ) : entries.length === 0 ? (
    <p className={cn("text-[12px] text-center py-4", portalSubtextAlt)}>
      {g.xpHistoryEmpty}
    </p>
  ) : (
    <ul className="space-y-0.5">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        >
          {/* Type icon */}
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              portalIconWell
            )}
          >
            <TypeIcon type={entry.type} />
          </div>

          {/* Label (with i18n fallback when backend omits it) */}
          <p
            className={cn(
              "text-[12px] flex-1 min-w-0 truncate",
              portalHeadingAlt
            )}
          >
            {resolveLabel(entry)}
          </p>

          {/* Time ago */}
          <time
            dateTime={entry.earnedAt}
            className={cn("text-[10px] shrink-0 tabular-nums", portalSubtextAlt)}
          >
            {timeAgo(entry.earnedAt, lang === "vi" ? "vi" : "en")}
          </time>

          {/* XP amount */}
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
            +{entry.xp}
          </span>
        </li>
      ))}
    </ul>
  );

  // ── Embedded mode — content only, no outer card ───────────────────────────
  if (embedded) return listContent;

  // ── Standalone card ───────────────────────────────────────────────────────
  return (
    <div className="hr-glass-card p-5">
      <h3
        className={cn(
          "text-[14px] font-bold mb-4 flex items-center gap-1.5",
          portalHeadingAlt
        )}
      >
        <Zap size={13} className="text-violet-500 shrink-0" />
        {g.xpHistoryTitle}
      </h3>
      {listContent}
    </div>
  );
}
