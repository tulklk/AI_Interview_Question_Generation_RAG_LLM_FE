"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { animate, motion } from "framer-motion";
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
// KPI animated value
// ---------------------------------------------------------------------------

function KpiValue({ value }: { value: string | number }) {
  const [display, setDisplay] = useState<string>("0");

  useEffect(() => {
    const str = String(value);
    const pctMatch = str.match(/^(\d+(?:\.\d+)?)%$/);

    let numVal: number | null = null;
    let suffix = "";

    if (typeof value === "number") {
      numVal = value;
    } else if (pctMatch) {
      numVal = parseFloat(pctMatch[1]);
      suffix = "%";
    }

    if (numVal === null) {
      setDisplay(str);
      return;
    }

    setDisplay("0" + suffix);
    const controls = animate(0, numVal, {
      duration: 1.0,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v) + suffix),
    });
    return () => controls.stop();
  }, [value]);

  return <>{display}</>;
}

// ---------------------------------------------------------------------------
// Mini sparkline (self-contained SVG — no recharts dependency)
// ---------------------------------------------------------------------------

const HR_SPARK_KEYFRAMES = `
  @keyframes hspLine { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes hspFill { from { opacity: 0; } to { opacity: 1; } }
  @keyframes hspDot  { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
`;

function HrSparkline({ data, color = "#7C3AED" }: { data: number[]; color?: string }) {
  const rawId = useId();
  const gid = `hsp${rawId.replace(/[^a-z0-9]/gi, "")}`;
  if (data.length < 2) return null;
  const W = 60, H = 28, pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max === min ? 1 : max - min;
  const pts = data.map((v, i) => ({
    x: +(pad + (i / (data.length - 1)) * (W - pad * 2)).toFixed(1),
    y: +(pad + (1 - (v - min) / range) * (H - pad * 2)).toFixed(1),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <style>{HR_SPARK_KEYFRAMES}</style>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} style={{ animation: "hspFill 0.5s ease-out both" }} />
      <path
        d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" strokeDasharray="1"
        style={{ strokeDashoffset: 1, animation: "hspLine 0.75s ease-out both" }}
      />
      <circle
        cx={last.x} cy={last.y} r="2.5" fill={color}
        style={{ transformOrigin: `${last.x}px ${last.y}px`, animation: "hspDot 0.3s ease-out 0.6s both" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  loading: boolean;
  sparkline?: number[];
  sparklineColor?: string;
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, loading, sparkline, sparklineColor = "#7C3AED" }: KpiCardProps) {
  const isNumeric = typeof value === "number" || /^\d+(?:\.\d+)?%?$/.test(String(value));
  const hasChart = !loading && sparkline && sparkline.length >= 2 && sparkline.some(v => v > 0);
  return (
    <div className="hr-glass-card p-4 flex flex-col gap-3 h-full min-h-28">

      {/* Row 1: icon (left) + sparkline (right) */}
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={18} className={iconColor} />
        </div>
        {hasChart ? (
          <motion.div
            key={sparkline!.join(",")}
            className="w-15 h-7 shrink-0"
            style={{ opacity: 0.7 }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <HrSparkline data={sparkline!} color={sparklineColor} />
          </motion.div>
        ) : (
          <div className="h-7" />
        )}
      </div>

      {/* Row 2: value — large, prominent */}
      {loading ? (
        <div className="h-7 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : (
        <p
          title={isNumeric ? undefined : String(value)}
          className={cn(
            "font-extrabold tracking-tight min-w-0 leading-none",
            isNumeric ? "text-[28px] tabular-nums" : "text-[15px] truncate",
            portalHeadingAlt
          )}
        >
          <KpiValue value={value} />
        </p>
      )}

      {/* Row 3: label — concise, bottom */}
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider leading-tight mt-auto", portalSubtextAlt)}>
        {label}
      </p>
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

/** Chuỗi skills dài (".NET, C#, Azure...") không phải tên role — ẩn / rút gọn. */
function sanitizeRoleLabel(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const commaCount = (trimmed.match(/,/g) ?? []).length;
  if (commaCount >= 2 || trimmed.length > 72) return null;
  return trimmed;
}

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
  const insights: { icon: React.ElementType; color: string; label: string; value: string }[] = [];

  const role = sanitizeRoleLabel(data.topRole);
  if (role) {
    insights.push({
      icon: Briefcase,
      color: "text-violet-600 dark:text-violet-400",
      label: labels.topRoleIs,
      value: role,
    });
  }

  if (data.totalSessions > 0) {
    insights.push({
      icon: TrendingUp,
      color: data.successRate >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
      label: labels.successRateIs,
      value: `${data.successRate}%`,
    });
  }

  if (data.questionTypeDistribution.length > 0) {
    const topType = data.questionTypeDistribution[0];
    insights.push({
      icon: MessageSquareText,
      color: "text-blue-600 dark:text-blue-400",
      label: labels.mostUsedType,
      value: `${topType.type} · ${topType.count}`,
    });
  }

  // Recent trend: prefer the BE's week-over-week figure; fall back to
  // comparing last 7 days vs prior 7 days from dailyActivity.
  if (data.weekOverWeekTrend) {
    const trend = data.weekOverWeekTrend;
    const trendText = trend === "up" ? labels.trendUp : trend === "down" ? labels.trendDown : labels.trendFlat;
    insights.push({
      icon: CalendarDays,
      color: trend === "up" ? "text-emerald-600 dark:text-emerald-400" : trend === "down" ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-400",
      label: labels.recentTrend,
      value: trendText,
    });
  } else {
    const activity = data.dailyActivity;
    if (activity.length >= 14) {
      const last7 = activity.slice(-7).reduce((s, d) => s + d.sessions, 0);
      const prior7 = activity.slice(-14, -7).reduce((s, d) => s + d.sessions, 0);
      const trendText = last7 > prior7 ? labels.trendUp : last7 < prior7 ? labels.trendDown : labels.trendFlat;
      insights.push({
        icon: CalendarDays,
        color: last7 > prior7 ? "text-emerald-600 dark:text-emerald-400" : last7 < prior7 ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-400",
        label: labels.recentTrend,
        value: trendText,
      });
    }
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
  iconBg?: string;
  iconColor?: string;
  children: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  headerRight?: React.ReactNode;
}

function ChartCard({ title, subtitle, icon: Icon, iconBg = "bg-gray-100 dark:bg-gray-800", iconColor = "text-gray-600 dark:text-gray-400", children, loading, empty, emptyText, headerRight }: ChartCardProps) {
  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon size={15} className={iconColor} />
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

function QuickAction({ icon: Icon, iconBg, iconColor, label, href }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
    >
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon size={15} className={iconColor} />
      </div>
      <p className={cn("text-[13px] font-semibold flex-1 leading-tight", portalHeadingAlt)}>{label}</p>
      <ArrowRight size={13} className="text-gray-400 group-hover:text-primary transition-colors shrink-0" />
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

  // ── Sparkline data derived from dailyActivity ──────────────────────────────
  const activity14 = data.dailyActivity.slice(-14);
  // Total sessions: raw daily count
  const totalSparkline = activity14.map(d => d.sessions);
  // Completed: estimated daily completed = sessions × overall success rate
  const completedSparkline = activity14.map(d =>
    Math.round(d.sessions * (data.successRate / 100))
  );
  // Questions generated: estimated = sessions × avg questions per session
  const avgQPerSession = data.totalSessions > 0
    ? data.totalQuestionsGenerated / data.totalSessions
    : 0;
  const questionsSparkline = activity14.map(d =>
    Math.round(d.sessions * avgQPerSession)
  );
  // Success rate trend: use same daily sessions pattern (BE has no daily breakdown)
  const successSparkline = totalSparkline;
  // This month: filter dailyActivity by current month ("MM/DD" format)
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  const thisMonthSparkline = data.dailyActivity
    .filter(d => d.date.startsWith(currentMonthStr + "/"))
    .map(d => d.sessions);

  const kpis: KpiCardProps[] = [
    {
      icon: Zap,
      iconBg: "bg-violet-100 dark:bg-violet-950/50",
      iconColor: "text-violet-600 dark:text-violet-400",
      label: p.kpi.totalSessions,
      value: data.totalSessions,
      loading: data.loading,
      sparkline: totalSparkline,
      sparklineColor: "#7C3AED",
    },
    {
      icon: CheckCircle2,
      iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      label: p.kpi.completedSessions,
      value: data.completedSessions,
      loading: data.loading,
      sparkline: completedSparkline,
      sparklineColor: "#10B981",
    },
    {
      icon: MessageSquareText,
      iconBg: "bg-blue-100 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      label: p.kpi.totalQuestions,
      value: data.totalQuestionsGenerated,
      loading: data.loading,
      sparkline: questionsSparkline,
      sparklineColor: "#3B82F6",
    },
    {
      icon: TrendingUp,
      iconBg: "bg-amber-100 dark:bg-amber-950/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      label: p.kpi.successRate,
      value: `${data.successRate}%`,
      loading: data.loading,
      sparkline: successSparkline,
      sparklineColor: "#F59E0B",
    },
    {
      icon: CalendarDays,
      iconBg: "bg-cyan-100 dark:bg-cyan-950/50",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      label: p.kpi.thisMonth,
      value: data.thisMonthSessions,
      loading: data.loading,
      sparkline: thisMonthSparkline,
      sparklineColor: "#06B6D4",
    },
    {
      icon: Briefcase,
      iconBg: "bg-rose-100 dark:bg-rose-950/50",
      iconColor: "text-rose-600 dark:text-rose-400",
      label: p.kpi.topRole,
      value: sanitizeRoleLabel(data.topRole) || "—",
      loading: data.loading,
      // no sparkline — text value, not numeric
    },
  ];

  const activityEmpty = !data.loading && data.dailyActivity.every((d) => d.sessions === 0);
  const typeEmpty = !data.loading && data.questionTypeDistribution.length === 0;

  const insights = buildInsights(data, p.insights);

  const planLabelMap: Record<string, string> = {
    HR_FREE: p.subscription.free,
    HR_PREMIUM: p.subscription.pro,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 items-stretch">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="h-full min-w-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </div>

      {data.hiringFunnel && (
        <div className="hr-glass-card p-5">
          <div className="mb-4">
            <h2 className={cn("text-[14px] font-bold", portalHeadingAlt)}>{p.funnel.title}</h2>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.funnel.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                { key: "practicedLast7Days", href: "/hr/candidate-recommendations", value: data.hiringFunnel.practicedLast7Days },
                { key: "newUnviewed", href: "/hr/candidate-recommendations?unviewed=true", value: data.hiringFunnel.newUnviewed },
                { key: "shortlisted", href: "/hr/candidate-recommendations?status=SHORTLISTED", value: data.hiringFunnel.shortlisted },
                { key: "invitedPending", href: "/hr/candidate-recommendations?status=INVITED", value: data.hiringFunnel.invitedPending },
                { key: "invitedAccepted", href: "/hr/candidate-recommendations?status=INVITED", value: data.hiringFunnel.invitedAccepted },
              ] as const
            ).map((col) => (
              <Link
                key={col.key}
                href={col.href}
                className="rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-3 hover:border-primary/40 transition-colors"
              >
                <p className={cn("text-[11px]", portalSubtextAlt)}>{p.funnel[col.key]}</p>
                <p className={cn("text-xl font-bold tabular-nums mt-1", portalHeadingAlt)}>{col.value}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
        <ChartCard
          title={p.activityChart.title}
          subtitle={p.activityChart.subtitle}
          icon={BarChart2}
          iconBg="bg-blue-100 dark:bg-blue-950/50"
          iconColor="text-blue-600 dark:text-blue-400"
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
          iconBg="bg-violet-100 dark:bg-violet-950/50"
          iconColor="text-violet-600 dark:text-violet-400"
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
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <History size={15} className="text-amber-600 dark:text-amber-400" />
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
              <Link href="/hr/generate-question" className="text-[12px] font-semibold text-primary hover:underline mt-1">
                {p.quickActions.generate} →
              </Link>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800/60">
                <span className={cn("flex-1 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.recentSessions.role}</span>
                <span className={cn("w-28 shrink-0 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.recentSessions.status}</span>
                <span className={cn("w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.recentSessions.questions}</span>
                <span className={cn("w-14 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>{p.recentSessions.created}</span>
              </div>
              {/* Rows */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {data.recentSessions.map((session) => {
                  const qCount = (session.generatedQuestions ?? []).filter((q) => q.question).length
                    || session.planDraft?.questionCount
                    || session.generatedQuestions?.length
                    || 0;
                  const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                  const jobTitle = session.jobTitle || session.planDraft?.role || "—";
                  return (
                    <Link
                      key={session.id}
                      href="/hr/generate-question"
                      onClick={() => {
                        try {
                          localStorage.setItem("studio_active_project_id", session.id);
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[13px] font-semibold truncate leading-tight group-hover:text-primary transition-colors", portalHeadingAlt)}>
                          {jobTitle}
                        </p>
                        {session.planDraft?.level && (
                          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{session.planDraft.level}</p>
                        )}
                      </div>
                      <div className="w-28 shrink-0">
                        {sessionStatusBadge(session.status, p.recentSessions.statusLabel)}
                      </div>
                      <div className={cn("w-8 shrink-0 text-right tabular-nums font-semibold text-[13px]", portalHeadingAlt)}>
                        {qCount > 0 ? qCount : "—"}
                      </div>
                      <div className={cn("w-14 shrink-0 text-right text-[11px] whitespace-nowrap", portalSubtextAlt)}>
                        {dateStr}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right column: Insights + Quick Actions */}
        <div className="flex flex-col gap-5">
          {/* AI Insights */}
          <motion.div className="hr-glass-card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center shrink-0">
                <Lightbulb size={15} className="text-yellow-600 dark:text-yellow-400" />
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
              <ul className="flex flex-col gap-2">
                {insights.map((ins, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/40"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800">
                      <ins.icon size={13} className={ins.color} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[10px] font-medium uppercase tracking-wide", portalSubtextAlt)}>
                        {ins.label}
                      </p>
                      <p
                        className={cn("mt-0.5 text-[12px] font-semibold leading-snug truncate", portalHeadingAlt)}
                        title={ins.value}
                      >
                        {ins.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div className="hr-glass-card p-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1", portalSubtextAlt)}>{p.quickActions.title}</p>
            <QuickAction icon={Zap} iconBg="bg-violet-100 dark:bg-violet-950/50" iconColor="text-violet-600 dark:text-violet-400" label={p.quickActions.generate} href="/hr/generate-question" />
            <QuickAction icon={History} iconBg="bg-amber-100 dark:bg-amber-950/50" iconColor="text-amber-600 dark:text-amber-400" label={p.quickActions.history} href="/hr/history" />
            <QuickAction icon={Users} iconBg="bg-blue-100 dark:bg-blue-950/50" iconColor="text-blue-600 dark:text-blue-400" label={p.quickActions.candidates} href="/hr/candidate-recommendations" />
            <QuickAction icon={Settings} iconBg="bg-emerald-100 dark:bg-emerald-950/50" iconColor="text-emerald-600 dark:text-emerald-400" label={p.quickActions.settings} href="/hr/settings" />
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
          <Link href="/hr/candidate-recommendations" className="text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors">
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
                {data.candidates.slice(0, 8).map((c: CandidateRecommendation, rowIdx: number) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    style={{ animation: `rowSlideIn 0.28s ease-out ${rowIdx * 45}ms both` }}
                  >
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
        <Link href="/hr/settings?tab=billing" className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1">
          {p.subscription.upgrade} <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
