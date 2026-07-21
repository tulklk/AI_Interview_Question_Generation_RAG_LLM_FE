"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, ChevronRight,
  BarChart2, Clock, RefreshCw, AlertCircle, History,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  listCompletedSessions,
  getPracticeStats,
  type CompletedSessionSummary,
  type PracticeStats,
} from "@/features/candidate/services/practice-session.service";
import { listQuestionSets, getBookmarkedSetIds } from "@/features/candidate/services/question-set.service";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { computeStreakDays } from "@/features/candidate/utils/practice-streak";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { QuestionSetCard } from "@/features/candidate/components/marketplace/question-set-card";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import { StatCard } from "@/features/candidate/components/ui/stat-card";
import { Pill, PendingScorePill, getScoreBadgeClass } from "@/features/candidate/components/ui/pill";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export function CandidateDashboard() {
  const { t } = useLanguage();
  const { user, loading } = useUser();
  const p = t.jobseekerDashboardPage;

  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [sessionsReloadKey, setSessionsReloadKey] = useState(0);

  const [recommendedSets, setRecommendedSets] = useState<QuestionSet[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState(false);
  const [setsReloadKey, setSetsReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    setSessionsError(false);
    Promise.all([listCompletedSessions({ pageSize: 100 }), getPracticeStats()])
      .then(([sessionsRes, statsRes]) => {
        if (cancelled) return;
        setSessions(sessionsRes.items);
        setStats(statsRes);
      })
      .catch(() => {
        if (!cancelled) setSessionsError(true);
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionsReloadKey]);

  useEffect(() => {
    let cancelled = false;
    setSetsLoading(true);
    setSetsError(false);
    listQuestionSets({ pageSize: 3 })
      .then((res) => {
        if (!cancelled) setRecommendedSets(res.items.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setSetsError(true);
      })
      .finally(() => {
        if (!cancelled) setSetsLoading(false);
      });
    getBookmarkedSetIds().then((ids) => {
      if (!cancelled) setBookmarkedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [setsReloadKey]);

  const greeting = getTimeOfDayGreeting({
    morning: p.greetingMorning,
    afternoon: p.greetingAfternoon,
    evening: p.greetingEvening,
    night: p.greetingNight,
  });
  const displayName = user?.fullName || (loading ? "..." : "User");
  const welcomeText = buildWelcomeMessage(p.welcomeTemplate, greeting, displayName);

  const sessionCount = stats?.totalSessions ?? 0;
  const avgScore = stats?.averageScore ?? null;
  const weeklyCount = sessions.filter((s) => {
    if (!s.completedAt) return false;
    const d = new Date(s.completedAt).getTime();
    return !Number.isNaN(d) && Date.now() - d <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const streakDays = computeStreakDays(sessions.map((s) => s.completedAt));
  const readinessKey = avgScore === null ? "low" : avgScore >= 80 ? "high" : avgScore >= 60 ? "medium" : "low";
  const readinessLabel = p.statValues.readinessLabels[readinessKey];

  const welcomeSub = sessionsLoading
    ? ""
    : sessionCount === 0
      ? p.welcomeSubEmpty
      : p.welcomeSubTemplate
          .replace("{{sets}}", String(recommendedSets.length))
          .replace("{{streak}}", String(streakDays));

  const iconBg = "bg-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10";
  const iconColor = "text-gray-900 dark:text-gray-100";
  const statCards = [
    { icon: BarChart2, label: p.statLabels[0], value: sessionCount.toString(), trend: weeklyCount > 0 ? p.weeklyTrendTemplate.replace("{{count}}", String(weeklyCount)) : undefined },
    { icon: BarChart2, label: p.statLabels[1], value: avgScore !== null ? `${avgScore}%` : "—", trend: undefined },
    { icon: Clock, label: p.statLabels[2], value: `${streakDays} ${streakDays === 1 ? "day" : "days"}`, trend: undefined },
    { icon: Sparkles, label: p.statLabels[3], value: readinessLabel, trend: p.statTrends[3] },
  ];

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
    .slice(0, 3);

  const recommendation = sessionsLoading
    ? ""
    : sessionCount === 0
      ? p.aiRecommendationEmpty
      : avgScore !== null
        ? p.aiRecommendationTemplate.replace("{{count}}", String(sessionCount)).replace("{{avg}}", String(avgScore))
        : p.aiRecommendationNoScore.replace("{{count}}", String(sessionCount));

  return (
    <div>
      <motion.div {...fadeUp(0)} className="mb-6">
        <h1 className={cn("text-[30px] font-[800] leading-[36px]", portalHeadingAlt)}>{welcomeText}</h1>
        <p className={cn("text-[16px] leading-[24px] mt-1", portalSubtextAlt)}>{welcomeSub}</p>
      </motion.div>

      <motion.div {...fadeUp(0.06)} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {sessionsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hr-stat-card p-5 h-full flex flex-col gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        ) : (
          statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <StatCard icon={stat.icon} iconBg={iconBg} iconColor={iconColor} value={stat.value} label={stat.label} trend={stat.trend} />
            </motion.div>
          ))
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-6">
        <div className="flex flex-col gap-6">
          <motion.div
            {...fadeUp(0.12)}
            className="hr-glass-card p-6"
          >
            <h2 className={cn("text-[16px] font-[700] mb-4", portalHeadingAlt)}>{p.analyticsTitle}</h2>
            <EmptyState icon={BarChart2} title={p.analyticsUnavailable} className="py-8" />
          </motion.div>

          <motion.div
            {...fadeUp(0.18)}
            className="hr-glass-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <div>
                <h2 className={cn("text-[15px] font-[700]", portalHeadingAlt)}>{p.recentTitle}</h2>
                <p className={cn("text-[12px]", portalSubtextAlt)}>{p.recentSubtitle}</p>
              </div>
              <Link href="/jobseeker/history" className="text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors">
                {p.viewAllHistory}
              </Link>
            </div>

            {sessionsLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : sessionsError ? (
              <div className="p-5 flex items-center justify-center gap-3">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className={cn("text-[13px]", portalSubtextAlt)}>{p.loadFailed}</p>
                <button type="button" onClick={() => setSessionsReloadKey((k) => k + 1)} className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
                  <RefreshCw size={12} />
                  {p.retryBtn}
                </button>
              </div>
            ) : recentSessions.length === 0 ? (
              <EmptyState icon={History} title={p.noSessionsYet} className="py-8" />
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {recentSessions.map((session) => (
                  <li key={session.id} className="hr-table-row flex items-center gap-4 px-5 py-3.5">
                    {session.companyLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.companyLogoUrl}
                        alt={session.company}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700"
                      />
                    ) : (
                      <div className={cn("w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", getCompanyColor(session.company))}>
                        {getCompanyInitials(session.company)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
                      <p className={cn("text-[11px] flex items-center gap-1", portalSubtextAlt)}>
                        <Clock size={10} />
                        {session.durationMinutes} min
                      </p>
                    </div>
                    {session.score !== null ? (
                      <Pill className={cn("text-[12px] font-[700] px-2.5 py-1", getScoreBadgeClass(session.score))}>
                        {session.score}%
                      </Pill>
                    ) : (
                      <PendingScorePill label={p.pendingScoreTooltip} className="text-[12px] px-2.5 py-1" />
                    )}
                    <Link href={`/jobseeker/practice/${session.questionSetId}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30 transition-colors"
                    >
                      <RefreshCw size={13} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>

        <div className="flex flex-col gap-4">
          <motion.div
            {...fadeUp(0.14)}
            className="hr-glass-card p-5"
          >
            <h3 className={cn("text-[14px] font-[700] mb-3", portalHeadingAlt)}>{p.skillBreakdownTitle}</h3>
            <p className={cn("text-[12px] leading-[18px]", portalSubtextAlt)}>{p.skillBreakdownUnavailable}</p>
          </motion.div>

          <motion.div
            {...fadeUp(0.22)}
            className="hr-quick-generate rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <h3 className={cn("text-[13px] font-[700]", portalHeadingAlt)}>{p.aiRecommendationTitle}</h3>
            </div>
            <p className={cn("text-[12px] leading-[18px] mb-4", portalSubtextAlt)}>{recommendation}</p>
            <Link
              href="/jobseeker/practice"
              className="flex items-center gap-1.5 text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors"
            >
              {p.startPractice}
              <ChevronRight size={12} />
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div {...fadeUp(0.28)}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={cn("text-[20px] font-[700]", portalHeadingAlt)}>{p.recommendedTitle}</h2>
            <p className={cn("text-[14px] mt-0.5", portalSubtextAlt)}>{p.recommendedSubtitle}</p>
          </div>
          <Link href="/jobseeker/practice" className="flex items-center gap-1 text-[13px] font-[600] text-primary hover:text-primary-hover transition-colors">
            {p.viewAllSets}
            <BarChart2 size={13} />
          </Link>
        </div>

        {setsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : setsError ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className={cn("text-[13px]", portalSubtextAlt)}>{p.loadFailed}</p>
            <button type="button" onClick={() => setSetsReloadKey((k) => k + 1)} className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
              <RefreshCw size={12} />
              {p.retryBtn}
            </button>
          </div>
        ) : recommendedSets.length === 0 ? (
          <EmptyState icon={Sparkles} title={p.noRecommendedSets} className="py-8" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendedSets.map((set, i) => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 + i * 0.08 }}
              >
                <QuestionSetCard set={set} initialBookmarked={bookmarkedIds.has(set.id)} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
