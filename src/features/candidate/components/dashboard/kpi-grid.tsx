"use client";

import { BarChart2, Clock, Flame, TrendingUp } from "lucide-react";
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
}

export function KpiGrid({ loading, stats, streakDays, sessionsLast7Days, readiness, scoreTrend, sessionsSparkline }: KpiGridProps) {
  const { t } = useLanguage();
  const k = t.jobseekerDashboardPage.kpi;

  const trendLabel =
    scoreTrend.deltaPct === null
      ? undefined
      : fillTemplate(scoreTrend.direction === "down" ? k.trendDown : k.trendUp, { pct: String(Math.abs(scoreTrend.deltaPct)) });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 mb-6">
      <ReadinessScoreCard readiness={readiness} loading={loading} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          loading={loading}
          icon={BarChart2}
          label={k.sessions.label}
          tooltip={k.sessions.tooltip}
          value={(stats?.totalSessions ?? 0).toString()}
          countUp={{ value: stats?.totalSessions ?? 0 }}
          trendLabel={sessionsLast7Days > 0 ? fillTemplate(k.weeklyTrend, { count: String(sessionsLast7Days) }) : undefined}
          trendDirection={sessionsLast7Days > 0 ? "up" : "flat"}
        />
        <KpiCard
          loading={loading}
          icon={TrendingUp}
          label={k.averageScore.label}
          tooltip={k.averageScore.tooltip}
          value={stats?.averageScore !== null && stats?.averageScore !== undefined ? `${stats.averageScore}%` : "—"}
          countUp={
            stats?.averageScore !== null && stats?.averageScore !== undefined
              ? { value: stats.averageScore, suffix: "%", decimals: 1 }
              : undefined
          }
          sparklineData={sessionsSparkline}
          trendLabel={trendLabel}
          trendDirection={scoreTrend.direction}
        />
        <KpiCard
          loading={loading}
          icon={Flame}
          label={k.streak.label}
          tooltip={k.streak.tooltip}
          value={`${streakDays}`}
          countUp={{ value: streakDays }}
        />
        <KpiCard
          loading={loading}
          icon={Clock}
          label={k.totalDuration.label}
          tooltip={k.totalDuration.tooltip}
          value={formatDuration(stats?.totalDurationMinutes ?? 0)}
          countUp={{
            value: stats?.totalDurationMinutes ?? 0,
            formatter: (v) => formatDuration(Math.round(v)),
          }}
        />
      </div>
    </div>
  );
}
