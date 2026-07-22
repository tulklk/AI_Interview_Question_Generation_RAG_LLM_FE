"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  Zap,
  CheckCircle2,
  MessageSquareText,
  TrendingUp,
  CalendarDays,
  Briefcase,
  BarChart2,
  PieChart,
  Users,
  History,
  Settings,
  Lightbulb,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useHrDashboard } from "@/features/hr/hooks/use-hr-dashboard";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { HrActivityChart } from "./hr-activity-chart";
import { HrTypeChart } from "./hr-type-chart";
import type { GenerationSession } from "@/features/interview/types/generation-session";
import type { CandidateRecommendation, RecommendationStatus } from "@/features/hr/services/recommendation.service";

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  value: string | number;
  loading: boolean;
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, desc, value, loading }: KpiCardProps) {
  return (
    <div className="hr-glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider truncate", portalSubtextAlt)}>{label}</p>
          <p className={cn("text-[10px] truncate", portalSubtextAlt)}>{desc}</p>
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : (
        <p className={cn("text-[26px] font-extrabold leading-none tracking-tight", portalHeadingAlt)}>
          {value}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge for session
// ---------------------------------------------------------------------------

function sessionStatusBadge(status: GenerationSession["status"], labels: Record<string, string>) {
  const label = labels[status] ?? status;
  if (status === "COMPLETED") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
      <CheckCircle2 size={10} />
      {label}
    </span>
  );
  if (status === "FAILED") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
      <AlertCircle size={10} />
      {label}
    </span>
  );
  if (["PROCESSING", "QUESTION_PROCESSING"].includes(status)) return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
      <Loader2 size={10} className="animate-spin" />
      {label}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Candidate status badge
// ---------------------------------------------------------------------------

const CANDIDATE_STATUS_STYLES: Record<RecommendationStatus, string> = {
  NEW: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
  VIEWED: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  SHORTLISTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  INVITED: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  DISMISSED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

function candidateStatusBadge(status: RecommendationStatus, label: string) {
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", CANDIDATE_STATUS_STYLES[status] ?? CANDIDATE_STATUS_STYLES.NEW)}>
      {label}
    </span>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 65) return "text-violet-600 dark:text-violet-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

// ---------------------------------------------------------------------------
// AI Insights derived from real data
// ---------------------------------------------------------------------------

function buildInsights(data: ReturnType<typeof useHrDashboard>, labels: {
  topRoleIs: string;
  successRateIs: string;
  mostUsedType: string;
  peakDay: string;
  recentTrend: string;
  trendUp: string;
  trendDown: string;
  trendFlat: string;
}) {
  const insights: { icon: React.ElementType; color: string; text: string }[] = [];

  if (data.topRole) {
    insights.push({
      icon: Briefcase,
      color: "text-violet-600 dark:text-violet-400",
      text: `${labels.topRoleIs}: "${data.topRole}"`,
    });
  }

  if (data.totalSessions > 0) {
    insights.push({
      icon: TrendingUp,
      color: data.successRate >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
      text: `${labels.successRateIs} ${data.successRate}%`,
    });
  }

  if (data.questionTypeDistribution.length > 0) {
    const topType = data.questionTypeDistribution[0];
    insights.push({
      icon: MessageSquareText,
      color: "text-blue-600 dark:text-blue-400",
      text: `${labels.mostUsedType}: ${topType.type} (${topType.count})`,
    });
  }

  // Recent trend: compare last 7 days vs prior 7 days
  const activity = data.dailyActivity;
  if (activity.length >= 14) {
    const last7 = activity.slice(-7).reduce((s, d) => s + d.sessions, 0);
    const prior7 = activity.slice(-14, -7).reduce((s, d) => s + d.sessions, 0);
    const trendText = last7 > prior7 ? labels.trendUp : last7 < prior7 ? labels.trendDown : labels.trendFlat;
    insights.push({
      icon: CalendarDays,
      color: last7 > prior7 ? "text-emerald-600 dark:text-emerald-400" : last7 < prior7 ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400",
      text: trendText,
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Chart card shell
// ---------------------------------------------------------------------------

interface ChartCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  headerRight?: React.ReactNode;
}

function ChartCard({ title, subtitle, icon: Icon, children, loading, empty, emptyText, headerRight }: ChartCardProps) {
  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
            <Icon size={15} className="text-primary" />
          </div>
          <div>
            <h2 className={cn("text-[14px] font-bold leading-tight", portalHeadingAlt)}>{title}</h2>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{subtitle}</p>
          </div>
        </div>
        {headerRight}
      </div>
      <div className="px-4 pt-4 pb-3">
        {loading ? (
          <div className="h-55 flex items-center justify-center">
            <Loader2 size={22} className="text-primary animate-spin" />
          </div>
        ) : empty ? (
          <div className="h-55 flex flex-col items-center justify-center gap-2">
            <Icon size={28} className="text-gray-300 dark:text-gray-700" />
            <p className={cn("text-[12px]", portalSubtextAlt)}>{emptyText}</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-11 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------

function QuickAction({ icon: Icon, iconBg, iconColor, label, desc, href }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] font-semibold leading-tight", portalHeadingAlt)}>{label}</p>
        <p className={cn("text-[11px] mt-0.5 truncate", portalSubtextAlt)}>{desc}</p>
      </div>
      <ArrowRight size={14} className="text-gray-400 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HrDashboard() {
  const { t } = useLanguage();
  const p = t.hrDashboardPage;
  const { planId } = useHrSubscription();

  const data = useHrDashboard();

  const kpis: KpiCardProps[] = [
    {
      icon: Zap,
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-500 dark:text-gray-400",
      label: p.kpi.totalSessions,
      desc: p.kpi.totalSessionsDesc,
      value: data.totalSessions,
      loading: data.loading,
    },
    {
      icon: CheckCircle2,
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-500 dark:text-gray-400",
      label: p.kpi.completedSessions,
      desc: p.kpi.completedSessionsDesc,
      value: data.completedSessions,
      loading: data.loading,
    },
    {
      icon: MessageSquareText,
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-500 dark:text-gray-400",
      label: p.kpi.totalQuestions,
      desc: p.kpi.totalQuestionsDesc,
      value: data.totalQuestionsGenerated,
      loading: data.loading,
    },
    {
      icon: TrendingUp,
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-500 dark:text-gray-400",
      label: p.kpi.successRate,
      desc: p.kpi.successRateDesc,
      value: `${data.successRate}%`,
      loading: data.loading,
    },
    {
      icon: CalendarDays,
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-500 dark:text-gray-400",
      label: p.kpi.thisMonth,
      desc: p.kpi.thisMonthDesc,
      value: data.thisMonthSessions,
      loading: data.loading,
    },
    {
      icon: Briefcase,
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-500 dark:text-gray-400",
      label: p.kpi.topRole,
      desc: p.kpi.topRoleDesc,
      value: data.topRole || "—",
      loading: data.loading,
    },
  ];

  const activityEmpty = !data.loading && data.dailyActivity.every((d) => d.sessions === 0);
  const typeEmpty = !data.loading && data.questionTypeDistribution.length === 0;

  const insights = buildInsights(data, p.insights);

  const planLabelMap: Record<string, string> = {
    basic: p.subscription.free,
    professional: p.subscription.pro,
    business: p.subscription.business,
    enterprise: p.subscription.business,
  };
  const planLabel = planLabelMap[planId] ?? planId;

  return (
    <div className="space-y-5">
      {/* Error banner */}
      {data.error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-[13px] text-red-600 dark:text-red-400 flex-1">{p.loadFailed}</p>
          <button
            type="button"
            onClick={data.reload}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw size={12} />
            {p.retryBtn}
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
        <ChartCard
          title={p.activityChart.title}
          subtitle={p.activityChart.subtitle}
          icon={BarChart2}
          loading={data.loading}
          empty={activityEmpty}
          emptyText={p.activityChart.empty}
        >
          <HrActivityChart data={data.dailyActivity} />
        </ChartCard>

        <ChartCard
          title={p.typeChart.title}
          subtitle={p.typeChart.subtitle}
          icon={PieChart}
          loading={data.loading}
          empty={typeEmpty}
          emptyText={p.typeChart.empty}
        >
          <HrTypeChart data={data.questionTypeDistribution} />
        </ChartCard>
      </div>

      {/* Recent Sessions + Insights row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Recent sessions table */}
        <motion.div className="hr-glass-card overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                <History size={15} className="text-primary" />
              </div>
              <div>
                <h2 className={cn("text-[14px] font-bold leading-tight", portalHeadingAlt)}>{p.recentSessions.title}</h2>
                <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.recentSessions.subtitle}</p>
              </div>
            </div>
            <Link href="/hr/history" className="text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors">
              {p.recentSessions.viewAll}
            </Link>
          </div>

          {data.loading ? (
            <SkeletonRows count={5} />
          ) : data.recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <History size={28} className="text-gray-300 dark:text-gray-700" />
              <p className={cn("text-[12px]", portalSubtextAlt)}>{p.recentSessions.empty}</p>
              <Link href="/hr/generate" className="text-[12px] font-semibold text-primary hover:underline mt-1">
                {p.quickActions.generate} →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.recentSessions.role}</th>
                    <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.recentSessions.status}</th>
                    <th className={cn("text-right px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.recentSessions.questions}</th>
                    <th className={cn("text-right px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.recentSessions.created}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.recentSessions.map((session) => {
                    const qCount = (session.generatedQuestions ?? []).filter((q) => q.question).length
                      || session.planDraft?.questionCount
                      || session.generatedQuestions?.length
                      || 0;
                    const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <tr key={session.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/hr/generate/${session.id}`} className={cn("font-medium hover:text-primary transition-colors line-clamp-1", portalHeadingAlt)}>
                            {session.jobTitle || "—"}
                          </Link>
                          {session.planDraft?.level && (
                            <span className={cn("text-[10px]", portalSubtextAlt)}>{session.planDraft.level}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sessionStatusBadge(session.status, p.recentSessions.statusLabel)}
                        </td>
                        <td className={cn("px-4 py-3 text-right tabular-nums font-medium", portalHeadingAlt)}>
                          {qCount > 0 ? qCount : "—"}
                        </td>
                        <td className={cn("px-4 py-3 text-right tabular-nums", portalSubtextAlt)}>
                          {dateStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Right column: Insights + Quick Actions */}
        <div className="flex flex-col gap-5">
          {/* AI Insights */}
          <motion.div className="hr-glass-card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <Lightbulb size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className={cn("text-[14px] font-bold leading-tight", portalHeadingAlt)}>{p.insights.title}</h2>
                <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.insights.subtitle}</p>
              </div>
            </div>
            {data.loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <p className={cn("text-[12px]", portalSubtextAlt)}>{p.insights.noInsights}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <ins.icon size={14} className={cn("mt-0.5 shrink-0", ins.color)} />
                    <span className={cn("text-[12px] leading-snug", portalSubtextAlt)}>{ins.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div className="hr-glass-card p-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1", portalSubtextAlt)}>{p.quickActions.title}</p>
            <QuickAction icon={Zap} iconBg="bg-violet-100 dark:bg-violet-950/50" iconColor="text-violet-600 dark:text-violet-400" label={p.quickActions.generate} desc={p.quickActions.generateDesc} href="/hr/generate" />
            <QuickAction icon={History} iconBg="bg-gray-100 dark:bg-gray-800" iconColor="text-gray-600 dark:text-gray-400" label={p.quickActions.history} desc={p.quickActions.historyDesc} href="/hr/history" />
            <QuickAction icon={Users} iconBg="bg-blue-100 dark:bg-blue-950/50" iconColor="text-blue-600 dark:text-blue-400" label={p.quickActions.candidates} desc={p.quickActions.candidatesDesc} href="/hr/candidates" />
            <QuickAction icon={Settings} iconBg="bg-emerald-100 dark:bg-emerald-950/50" iconColor="text-emerald-600 dark:text-emerald-400" label={p.quickActions.settings} desc={p.quickActions.settingsDesc} href="/hr/settings" />
          </motion.div>
        </div>
      </div>

      {/* Candidates table */}
      <motion.div className="hr-glass-card overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
              <Users size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={cn("text-[14px] font-bold leading-tight", portalHeadingAlt)}>{p.candidates.title}</h2>
              <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.candidates.subtitle}</p>
            </div>
          </div>
          <Link href="/hr/candidates" className="text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors">
            {p.candidates.viewAll}
          </Link>
        </div>

        {data.loading ? (
          <SkeletonRows count={4} />
        ) : data.candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Users size={28} className="text-gray-300 dark:text-gray-700" />
            <p className={cn("text-[12px]", portalSubtextAlt)}>{p.candidates.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                  <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.candidates.name}</th>
                  <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.candidates.role}</th>
                  <th className={cn("text-right px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.candidates.score}</th>
                  <th className={cn("text-right px-4 py-2.5 font-semibold", portalSubtextAlt)}>{p.candidates.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.candidates.slice(0, 8).map((c: CandidateRecommendation) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className={cn("font-medium leading-tight", portalHeadingAlt)}>{c.candidateName || "—"}</p>
                      <p className={cn("text-[10px] truncate max-w-40", portalSubtextAlt)}>{c.candidateEmail}</p>
                    </td>
                    <td className={cn("px-4 py-3", portalSubtextAlt)}>{c.targetRole || "—"}</td>
                    <td className={cn("px-4 py-3 text-right font-bold tabular-nums", scoreColor(c.score))}>
                      {c.score > 0 ? `${c.score}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {candidateStatusBadge(c.status, p.candidates.statusLabel[c.status] ?? c.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Subscription footer */}
      <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className={cn("text-[12px]", portalSubtextAlt)}>{p.subscription.title}:</span>
          <span className="text-[12px] font-bold text-primary">{planLabel}</span>
        </div>
        <Link href="/hr/settings/billing" className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1">
          {p.subscription.upgrade} <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
