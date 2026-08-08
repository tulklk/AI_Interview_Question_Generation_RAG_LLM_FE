"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BookOpen,
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeadingAlt, portalMutedBg, portalSubtext, portalSubtextAlt } from "@/shared/utils/portal-ui";
import {
  getHrCandidateOverview,
  type HrCandidateAchievementFlag,
  type HrCandidateOverview,
} from "@/features/hr/services/hr-candidate.service";
import { buildPracticeHeatmapFromBuckets } from "@/features/candidate/utils/dashboard-analytics";
import { PracticeHeatmap } from "@/features/candidate/components/dashboard/practice-heatmap";

function achievementMeta(
  id: string,
  items: {
    firstPractice: { title: string; description: string };
    streak7: { title: string; description: string };
    highScorer: { title: string; description: string };
    speedDemon: { title: string; description: string };
    consistentLearner: { title: string; description: string };
  }
): { title: string; description: string; icon: string } | null {
  switch (id) {
    case "first-practice":
      return { ...items.firstPractice, icon: "🎯" };
    case "streak-7":
      return { ...items.streak7, icon: "🔥" };
    case "high-scorer":
      return { ...items.highScorer, icon: "⭐" };
    case "speed-demon":
      return { ...items.speedDemon, icon: "⚡" };
    case "consistent-learner":
      return { ...items.consistentLearner, icon: "📚" };
    default:
      return null;
  }
}

function statusLabel(
  status: string,
  labels: { inProgress: string; completed: string; abandoned: string }
): string {
  const u = status.toUpperCase();
  if (u === "COMPLETED") return labels.completed;
  if (u === "ABANDONED") return labels.abandoned;
  return labels.inProgress;
}

/** SCRUM-398: stats + achievements + bảng bộ của HR — nhúng vào recommendation detail / overview. */
export function HrCandidatePracticePanel({ candidateUserId }: { candidateUserId: string }) {
  const { t, lang } = useLanguage();
  const p = t.hrCandidateOverviewPage;
  const [data, setData] = useState<HrCandidateOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!candidateUserId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getHrCandidateOverview(candidateUserId));
    } catch (e) {
      setData(null);
      setError(e instanceof Error && e.message ? e.message : p.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [candidateUserId, p.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!candidateUserId) return null;

  if (loading) {
    return (
      <div className="hr-glass-card p-8 flex flex-col items-center gap-2">
        <Loader2 size={22} className="animate-spin text-primary" />
        <p className={cn("text-[13px]", portalSubtext)}>{p.loading}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="hr-glass-card p-6 flex flex-col items-center gap-2 text-center">
        <AlertCircle size={22} className="text-red-500" />
        <p className={cn("text-[13px]", portalSubtext)}>{error || p.loadFailed}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
        >
          <RefreshCw size={12} /> {p.retryBtn}
        </button>
      </div>
    );
  }

  const streakLabel =
    data.currentStreakDays === 1
      ? `1 ${p.stats.day}`
      : `${data.currentStreakDays} ${p.stats.days}`;

  const visibleAchievements = data.achievements
    .map((a: HrCandidateAchievementFlag) => {
      const meta = achievementMeta(a.id, p.achievementItems);
      if (!meta) return null;
      return { ...a, ...meta };
    })
    .filter(Boolean) as Array<HrCandidateAchievementFlag & { title: string; description: string; icon: string }>;

  const earnedCount = visibleAchievements.filter((a) => a.earned).length;

  const practiceHeatmap = buildPracticeHeatmapFromBuckets(data.heatmapDays, 52, {
    currentStreak: data.currentStreakDays,
    longestStreak: data.longestStreakDays || undefined,
    activeDays: data.activeDaysInWindow || undefined,
  });

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="hr-glass-card p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
            <Award size={13} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>
            {p.heading}
          </h2>
        </div>
        <p className={cn("text-[11px] mb-3", portalSubtextAlt)}>{p.statsHint}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
            <BookOpen size={14} className="mx-auto mb-1 text-blue-500" />
            <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
              {data.totalSessions}
            </p>
            <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.sessions}</p>
          </div>
          <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
            <TrendingUp size={14} className="mx-auto mb-1 text-violet-500" />
            <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
              {data.averageScore != null ? `${data.averageScore.toFixed(1)}%` : "—"}
            </p>
            <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.avgScore}</p>
          </div>
          <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
            <Trophy size={14} className="mx-auto mb-1 text-amber-500" />
            <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>
              {data.bestScore != null ? `${data.bestScore.toFixed(1)}%` : "—"}
            </p>
            <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.bestScore}</p>
          </div>
          <div className={cn("rounded-xl px-3 py-3 text-center", portalMutedBg)}>
            <Flame size={14} className="mx-auto mb-1 text-orange-500" />
            <p className={cn("text-[16px] font-extrabold tabular-nums", portalHeadingAlt)}>{streakLabel}</p>
            <p className={cn("text-[10px]", portalSubtextAlt)}>{p.stats.streak}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="hr-glass-card p-5"
      >
        <div className="mb-3">
          <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>
            {p.heatmap.title}
          </h2>
          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.heatmap.subtitle}</p>
        </div>
        {practiceHeatmap.activeDays === 0 ? (
          <p className={cn("text-[13px] py-4 text-center", portalSubtext)}>{p.heatmap.empty}</p>
        ) : (
          <PracticeHeatmap heatmap={practiceHeatmap} source="hr" />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="hr-glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>
            {p.achievementsTitle}
          </h2>
          <span className={cn("text-[11px] font-semibold", portalSubtextAlt)}>
            {earnedCount}/{visibleAchievements.length} {p.earned}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visibleAchievements.map((ach) => (
            <div
              key={ach.id}
              title={ach.description}
              className={cn(
                "flex items-start gap-2.5 rounded-xl px-3 py-2.5 border",
                ach.earned
                  ? "border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20"
                  : "border-gray-100 dark:border-gray-800 opacity-50"
              )}
            >
              <span className="text-base leading-none mt-0.5">{ach.icon}</span>
              <div className="min-w-0">
                <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{ach.title}</p>
                <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{ach.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hr-glass-card p-5"
      >
        <h2 className={cn("text-[13px] font-bold uppercase tracking-wider mb-1", portalSubtextAlt)}>
          {p.practiceTableTitle}
        </h2>
        <p className={cn("text-[11px] mb-3", portalSubtextAlt)}>{p.practiceTableHint}</p>

        {data.practiceOnMySets.length === 0 ? (
          <p className={cn("text-[13px] py-4 text-center", portalSubtext)}>{p.practiceEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/50">
                  <th className={cn("px-3 py-2 text-left text-[11px] font-semibold", portalSubtextAlt)}>
                    {p.colTitle}
                  </th>
                  <th className={cn("px-3 py-2 text-left text-[11px] font-semibold", portalSubtextAlt)}>
                    {p.colStatus}
                  </th>
                  <th className={cn("px-3 py-2 text-center text-[11px] font-semibold", portalSubtextAlt)}>
                    {p.colScore}
                  </th>
                  <th className={cn("px-3 py-2 text-left text-[11px] font-semibold", portalSubtextAlt)}>
                    {p.colDate}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.practiceOnMySets.map((row, i) => (
                  <tr
                    key={`${row.questionSetId}-${row.startedAt ?? i}`}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/hr/history/${row.questionSetId}`}
                        className={cn("font-semibold text-primary hover:underline", portalHeadingAlt)}
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className={cn("px-3 py-2.5", portalSubtext)}>
                      {statusLabel(row.sessionStatus, p.statusLabels)}
                    </td>
                    <td className={cn("px-3 py-2.5 text-center tabular-nums font-semibold", portalHeadingAlt)}>
                      {row.overallScore != null ? row.overallScore.toFixed(0) : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5", portalSubtext)}>
                      {row.completedAt
                        ? formatRelativeTime(row.completedAt, lang)
                        : row.startedAt
                          ? formatRelativeTime(row.startedAt, lang)
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
