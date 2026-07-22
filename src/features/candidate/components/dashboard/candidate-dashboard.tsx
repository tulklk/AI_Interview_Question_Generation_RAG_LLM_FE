"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, BarChart2, RefreshCw, AlertCircle, History,
  LineChart, Radar, CalendarDays, Briefcase, ListChecks, Bot,
  PieChart, Building2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { listQuestionSets, getBookmarkedSetIds } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { QuestionSetCard } from "@/features/candidate/components/marketplace/question-set-card";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { ChartCard } from "@/features/candidate/components/ui/chart-card";
import { useCandidateDashboard } from "@/features/candidate/hooks/use-candidate-dashboard";
import { DashboardHeader } from "@/features/candidate/components/dashboard/dashboard-header";
import { KpiGrid } from "@/features/candidate/components/dashboard/kpi-grid";
import { PerformanceTrendChart } from "@/features/candidate/components/dashboard/performance-trend-chart";
import { PracticeHeatmap } from "@/features/candidate/components/dashboard/practice-heatmap";
import { SkillRadarPanel } from "@/features/candidate/components/dashboard/skill-radar-panel";
import { WeakSkillsTable } from "@/features/candidate/components/dashboard/weak-skills-table";
import { AiCoachPanel } from "@/features/candidate/components/dashboard/ai-coach-panel";
import { RoleReadinessList } from "@/features/candidate/components/dashboard/role-readiness-list";
import { WeeklyGoalCard } from "@/features/candidate/components/dashboard/weekly-goal-card";
import { RecentSessionsList } from "@/features/candidate/components/dashboard/recent-sessions-list";
import { ScoreDistributionChart } from "@/features/candidate/components/dashboard/score-distribution-chart";
import { CompanyScoreChart } from "@/features/candidate/components/dashboard/company-score-chart";

export function CandidateDashboard() {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage;

  const dashboard = useCandidateDashboard();

  const [recommendedSets, setRecommendedSets] = useState<QuestionSet[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState(false);
  const [setsReloadKey, setSetsReloadKey] = useState(0);

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

  function handleBookmarkChange(setId: string, bookmarked: boolean) {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (bookmarked) next.add(setId);
      else next.delete(setId);
      return next;
    });
  }

  const trendState = dashboard.loading ? "loading" : dashboard.error ? "error" : dashboard.performanceTrend.length < 2 ? "empty" : "ready";
  const skillsState = dashboard.loading ? "loading" : dashboard.error ? "error" : !dashboard.skillAnalytics ? "empty" : "ready";
  const heatmapState = dashboard.loading ? "loading" : dashboard.error ? "error" : dashboard.practiceHeatmap.activeDays === 0 ? "empty" : "ready";
  const rolesState = dashboard.loading ? "loading" : dashboard.error ? "error" : dashboard.roleReadiness.length === 0 ? "empty" : "ready";

  const scoredSessions = dashboard.allSessions.filter((s) => s.score !== null);
  const distState = dashboard.loading ? "loading" : dashboard.error ? "error" : scoredSessions.length < 2 ? "empty" : "ready";

  const companies = new Set(scoredSessions.map((s) => s.company).filter(Boolean));
  const companyState = dashboard.loading ? "loading" : dashboard.error ? "error" : companies.size < 2 ? "empty" : "ready";

  return (
    <div>
      <DashboardHeader
        loading={dashboard.loading}
        stats={dashboard.stats}
        streakDays={dashboard.streakDays}
        timeRange={dashboard.timeRange}
        onTimeRangeChange={dashboard.setTimeRange}
      />

      <KpiGrid
        loading={dashboard.loading}
        stats={dashboard.stats}
        streakDays={dashboard.streakDays}
        sessionsLast7Days={dashboard.sessionsLast7Days}
        readiness={dashboard.readiness}
        scoreTrend={dashboard.scoreTrend}
        sessionsSparkline={dashboard.sessionsSparkline}
      />

      <div className="mb-6">
        <ChartCard
          title={p.trendChart.title}
          subtitle={p.trendChart.subtitle}
          icon={LineChart}
          state={trendState}
          emptyIcon={LineChart}
          emptyTitle={p.trendChart.empty}
          errorLabel={p.trendChart.error}
          retryLabel={p.retryBtn}
          onRetry={dashboard.reload}
          minHeight={260}
        >
          <PerformanceTrendChart data={dashboard.performanceTrend} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title={p.scoreDistribution.title}
          subtitle={p.scoreDistribution.subtitle}
          icon={PieChart}
          state={distState}
          emptyIcon={PieChart}
          emptyTitle={p.scoreDistribution.empty}
          errorLabel={p.trendChart.error}
          retryLabel={p.retryBtn}
          onRetry={dashboard.reload}
          minHeight={220}
        >
          <ScoreDistributionChart sessions={dashboard.allSessions} />
        </ChartCard>

        <ChartCard
          title={p.companyScore.title}
          subtitle={p.companyScore.subtitle}
          icon={Building2}
          state={companyState}
          emptyIcon={Building2}
          emptyTitle={p.companyScore.empty}
          errorLabel={p.trendChart.error}
          retryLabel={p.retryBtn}
          onRetry={dashboard.reload}
          minHeight={220}
        >
          <CompanyScoreChart sessions={dashboard.allSessions} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title={p.skills.title}
          subtitle={p.skills.subtitle}
          icon={Radar}
          state={skillsState}
          emptyIcon={Radar}
          emptyTitle={p.skills.empty}
          errorLabel={p.trendChart.error}
          retryLabel={p.retryBtn}
          onRetry={dashboard.reload}
          minHeight={280}
        >
          {dashboard.skillAnalytics && <SkillRadarPanel skillAnalytics={dashboard.skillAnalytics} />}
        </ChartCard>

        <div className="hr-glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 className={cn("text-[15px] font-bold leading-tight", portalHeadingAlt)}>{p.coach.title}</h2>
              <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.coach.subtitle}</p>
            </div>
          </div>
          <AiCoachPanel recommendations={dashboard.aiRecommendations} loading={dashboard.loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title={p.heatmap.title}
          subtitle={p.heatmap.subtitle}
          icon={CalendarDays}
          state={heatmapState}
          emptyIcon={CalendarDays}
          emptyTitle={p.heatmap.empty}
          errorLabel={p.trendChart.error}
          retryLabel={p.retryBtn}
          onRetry={dashboard.reload}
          minHeight={180}
        >
          <PracticeHeatmap heatmap={dashboard.practiceHeatmap} />
        </ChartCard>

        <div className="hr-glass-card p-5 sm:p-6">
          <h2 className={cn("text-[15px] font-bold leading-tight mb-4", portalHeadingAlt)}>{p.weeklyGoal.title}</h2>
          <WeeklyGoalCard sessions={dashboard.allSessions} />
        </div>
      </div>

      <div id="role-readiness" className="scroll-mt-20 mb-6">
        <ChartCard
          title={p.roles.title}
          subtitle={p.roles.subtitle}
          icon={Briefcase}
          state={rolesState}
          emptyIcon={Briefcase}
          emptyTitle={p.roles.empty}
          errorLabel={p.trendChart.error}
          retryLabel={p.retryBtn}
          onRetry={dashboard.reload}
          minHeight={140}
        >
          <RoleReadinessList roles={dashboard.roleReadiness} />
        </ChartCard>
      </div>

      {dashboard.skillAnalytics && dashboard.skillAnalytics.skills.some((s) => s.score < 80) && (
        <div className="hr-glass-card p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <ListChecks size={15} className="text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className={cn("text-[15px] font-bold leading-tight", portalHeadingAlt)}>{p.weakSkillsTable.title}</h2>
          </div>
          <WeakSkillsTable skills={dashboard.skillAnalytics.skills} />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hr-glass-card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <div>
            <h2 className={cn("text-[15px] font-[700]", portalHeadingAlt)}>{p.recentTitle}</h2>
            <p className={cn("text-[12px]", portalSubtextAlt)}>{p.recentSubtitle}</p>
          </div>
          <Link href="/jobseeker/history" className="text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors">
            {p.viewAllHistory}
          </Link>
        </div>

        {dashboard.loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : dashboard.error ? (
          <div className="p-5 flex items-center justify-center gap-3">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className={cn("text-[13px]", portalSubtextAlt)}>{p.loadFailed}</p>
            <button type="button" onClick={dashboard.reload} className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
              <RefreshCw size={12} />
              {p.retryBtn}
            </button>
          </div>
        ) : dashboard.recentSessions.length === 0 ? (
          <EmptyState icon={History} title={p.noSessionsYet} className="py-8" />
        ) : (
          <RecentSessionsList
            sessions={dashboard.recentSessions}
            bookmarkedIds={bookmarkedIds}
            onBookmarkChange={handleBookmarkChange}
          />
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
                transition={{ delay: i * 0.08 }}
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
