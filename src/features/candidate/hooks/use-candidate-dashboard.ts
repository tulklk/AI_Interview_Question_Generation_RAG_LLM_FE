"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listCompletedSessions,
  getPracticeStats,
  type CompletedSessionSummary,
  type PracticeStats,
} from "@/features/candidate/services/practice-session.service";
import { computeStreakDays } from "@/features/candidate/utils/practice-streak";
import {
  buildAiRecommendations,
  buildPerformanceTrend,
  buildPracticeHeatmap,
  buildRoleReadiness,
  buildScoreSparkline,
  buildSkillAnalytics,
  calculateReadinessScore,
  computePeriodComparison,
  daysSince,
  filterSessionsByRange,
  formatTrend,
  type TimeRangeKey,
} from "@/features/candidate/utils/dashboard-analytics";
import { useLanguage } from "@/shared/providers/language-context";

const RANGE_COMPARISON_DAYS: Record<TimeRangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, all: 30 };

export function useCandidateDashboard() {
  const { lang } = useLanguage();
  const [allSessions, setAllSessions] = useState<CompletedSessionSummary[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([listCompletedSessions({ pageSize: 200 }), getPracticeStats()])
      .then(([sessionsRes, statsRes]) => {
        if (cancelled) return;
        setAllSessions(sessionsRes.items);
        setStats(statsRes);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const sessions = useMemo(() => filterSessionsByRange(allSessions, timeRange), [allSessions, timeRange]);

  const streakDays = useMemo(() => computeStreakDays(allSessions.map((s) => s.completedAt)), [allSessions]);

  const sessionsLast7Days = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return allSessions.filter((s) => new Date(s.completedAt ?? 0).getTime() >= cutoff).length;
  }, [allSessions]);

  const mostRecentCompletedAt = useMemo(() => {
    return allSessions.reduce<string | undefined>((latest, s) => {
      if (!s.completedAt) return latest;
      if (!latest || new Date(s.completedAt) > new Date(latest)) return s.completedAt;
      return latest;
    }, undefined);
  }, [allSessions]);

  const readiness = useMemo(
    () => calculateReadinessScore(allSessions, stats?.averageScore ?? null, streakDays),
    [allSessions, stats, streakDays]
  );

  const periodComparison = useMemo(
    () => computePeriodComparison(allSessions, RANGE_COMPARISON_DAYS[timeRange]),
    [allSessions, timeRange]
  );
  const scoreTrend = useMemo(
    () => formatTrend(periodComparison.currentAvg, periodComparison.previousAvg),
    [periodComparison]
  );

  const performanceTrend = useMemo(() => buildPerformanceTrend(sessions), [sessions]);
  const practiceHeatmap = useMemo(() => buildPracticeHeatmap(allSessions), [allSessions]);
  const roleReadiness = useMemo(() => buildRoleReadiness(allSessions), [allSessions]);
  const skillAnalytics = useMemo(() => buildSkillAnalytics(allSessions, lang), [allSessions, lang]);
  const sessionsSparkline = useMemo(() => buildScoreSparkline(allSessions), [allSessions]);

  const aiRecommendations = useMemo(
    () =>
      buildAiRecommendations({
        totalSessions: stats?.totalSessions ?? 0,
        averageScore: stats?.averageScore ?? null,
        streakDays,
        sessionsLast7Days,
        daysSinceLastSession: daysSince(mostRecentCompletedAt),
        trend: scoreTrend,
        skillAnalytics,
        readiness,
      }),
    [stats, streakDays, sessionsLast7Days, mostRecentCompletedAt, scoreTrend, skillAnalytics, readiness]
  );

  const recentSessions = useMemo(
    () =>
      [...allSessions]
        .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
        .slice(0, 5),
    [allSessions]
  );

  return {
    loading,
    error,
    reload,
    stats,
    allSessions,
    sessions,
    recentSessions,
    timeRange,
    setTimeRange,
    streakDays,
    sessionsLast7Days,
    readiness,
    scoreTrend,
    performanceTrend,
    practiceHeatmap,
    roleReadiness,
    skillAnalytics,
    sessionsSparkline,
    aiRecommendations,
  };
}
