"use client";

import { BarChart2, Clock, Flame, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { KpiCard } from "@/features/candidate/components/dashboard/kpi-card";
import { ReadinessScoreCard } from "@/features/candidate/components/dashboard/readiness-score-card";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate, formatDuration, type ReadinessResult, type TrendResult } from "@/features/candidate/utils/dashboard-analytics";
import type { PracticeStats } from "@/features/candidate/services/practice-session.service";

interface KpiGridProps {
  loading: boolean;
  stats: PracticeStats | null;
  streakDays: number;
  sessionsLast7Days: number;
  readiness: ReadinessResult;
  scoreTrend: TrendResult;
  sessionsSparkline: number[];
  sessionCountSparkline: number[];
  streakSparkline: number[];
  durationSparkline: number[];
}

export function KpiGrid({ loading, stats, streakDays, sessionsLast7Days, readiness, scoreTrend, sessionsSparkline, sessionCountSparkline, streakSparkline, durationSparkline }: KpiGridProps) {
  const { t } = useLanguage();
  const k = t.jobseekerDashboardPage.kpi;

  const trendLabel =
    scoreTrend.deltaPct === null
      ? undefined
      : fillTemplate(scoreTrend.direction === "down" ? k.trendDown : k.trendUp, { pct: String(Math.abs(scoreTrend.deltaPct)) });

  const kpiCards = [
    {
      loading,
      icon: BarChart2,
      iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      label: k.sessions.label,
      tooltip: k.sessions.tooltip,
      value: (stats?.totalSessions ?? 0).toString(),
      countUp: { value: stats?.totalSessions ?? 0 },
      sparklineData: sessionCountSparkline,
      sparklineColor: "#10B981",
      trendLabel: sessionsLast7Days > 0 ? fillTemplate(k.weeklyTrend, { count: String(sessionsLast7Days) }) : undefined,
      trendDirection: (sessionsLast7Days > 0 ? "up" : "flat") as "up" | "flat",
    },
    {
      loading,
      icon: TrendingUp,
      iconBg: "bg-violet-100 dark:bg-violet-950/50",
      iconColor: "text-violet-600 dark:text-violet-400",
      label: k.averageScore.label,
      tooltip: k.averageScore.tooltip,
      value: stats?.averageScore !== null && stats?.averageScore !== undefined ? `${stats.averageScore}%` : "—",
      countUp: stats?.averageScore !== null && stats?.averageScore !== undefined
        ? { value: stats.averageScore, suffix: "%" as const, decimals: 1 }
        : undefined,
      sparklineData: sessionsSparkline,
      sparklineColor: "#7C3AED",
      trendLabel,
      trendDirection: scoreTrend.direction,
    },
    {
      loading,
      icon: Flame,
      iconBg: "bg-amber-100 dark:bg-amber-950/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      label: k.streak.label,
      tooltip: k.streak.tooltip,
      value: `${streakDays}`,
      countUp: { value: streakDays },
      sparklineData: streakSparkline,
      sparklineColor: "#F59E0B",
    },
    {
      loading,
      icon: Clock,
      iconBg: "bg-blue-100 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      label: k.totalDuration.label,
      tooltip: k.totalDuration.tooltip,
      value: formatDuration(stats?.totalDurationMinutes ?? 0),
      countUp: {
        value: stats?.totalDurationMinutes ?? 0,
        formatter: (v: number) => formatDuration(Math.round(v)),
      },
      sparklineData: durationSparkline,
      sparklineColor: "#3B82F6",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 mb-6">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <ReadinessScoreCard readiness={readiness} loading={loading} />
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: "easeOut" }}
          >
            <KpiCard {...card} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
