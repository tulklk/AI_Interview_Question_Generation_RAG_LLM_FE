"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, BarChart3, Loader2, Trophy, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { getScoreBandHex } from "@/features/hr/utils/score-band";
import {
  getQuestionSetInsights,
  type LeaderboardItem,
  type QuestionInsightItem,
  type QuestionSetInsights,
} from "@/features/hr/services/hr-insights.service";
import { PublishedHubInsightsSkeleton } from "./published-skeletons";

type SortDir = "asc" | "desc";

const PASS = "#10B981";
const FAIL = "#F43F5E";

const BANDS = [
  { id: "low", min: 0, max: 69.999, fill: "#EF4444" },
  { id: "fair", min: 70, max: 79.999, fill: "#F59E0B" },
  { id: "good", min: 80, max: 89.999, fill: "#8B5CF6" },
  { id: "excellent", min: 90, max: 100, fill: "#10B981" },
] as const;

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function scoreText(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
}

function clip(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function PublishedHubInsights({
  questionSetId,
  isHiring,
  includePractice,
  onIncludePracticeChange,
}: {
  questionSetId: string;
  isHiring: boolean;
  includePractice: boolean;
  onIncludePracticeChange: (next: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const h = t.publishedHubPage;
  const i = h.insights;
  const [data, setData] = useState<QuestionSetInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void getQuestionSetInsights(questionSetId, isHiring && includePractice)
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [questionSetId, isHiring, includePractice]);

  const questions = useMemo(() => {
    const list = [...(data?.questions ?? [])];
    list.sort((a, b) => {
      const diff = a.passRate - b.passRate;
      if (diff !== 0) return sortDir === "asc" ? diff : -diff;
      return a.order - b.order;
    });
    return list;
  }, [data?.questions, sortDir]);

  const chartQuestions = useMemo(
    () => [...(data?.questions ?? [])].sort((a, b) => a.order - b.order),
    [data?.questions]
  );

  if (loading && !data) return <PublishedHubInsightsSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
        <p className={cn("text-sm", portalSubtext)}>{i.loadFailed}</p>
      </div>
    );
  }

  const summary = data.summary;
  const bandLabels: Record<(typeof BANDS)[number]["id"], string> = {
    low: i.bandLow,
    fair: i.bandFair,
    good: i.bandGood,
    excellent: i.bandExcellent,
  };

  return (
    <div className="space-y-5">
      {isHiring && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-950/40">
          <input
            type="checkbox"
            checked={includePractice}
            onChange={(e) => onIncludePracticeChange(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className={cn("block text-xs font-semibold", portalHeading)}>{h.showPracticeToggle}</span>
            <span className={cn("block text-[11px] mt-0.5", portalSubtext)}>{h.showPracticeHint}</span>
          </span>
        </label>
      )}

      <p className={cn("text-xs", portalSubtext)}>
        {i.threshold.replace("{{score}}", String(data.passThreshold))} · {i.sampleHint}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={isHiring ? h.metricApplicants : h.metricAttempts} value={String(summary.completedCount)} sub={i.metricCompletedSub} />
        <Kpi label={h.metricAvgScore} value={scoreText(summary.averageScore)} sub={h.metricAvgScoreSub} accent={summary.averageScore} />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{i.metricPass}</p>
            <p className={cn("mt-2 text-2xl font-bold tabular-nums", portalHeading)}>{pct(summary.passRateOverall)}</p>
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{i.metricPassSub}</p>
          </div>
          <PassRing rate={summary.passRateOverall} />
        </div>
        <Kpi label={i.metricEvaluated} value={String(summary.evaluatedAnswerCount)} sub={i.metricEvaluatedSub} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40 xl:col-span-3">
          <div>
            <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", portalHeading)}>
              <BarChart3 size={14} /> {i.chartQuestions}
            </h3>
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{i.chartQuestionsHint}</p>
          </div>
          <QuestionPassChart
            items={chartQuestions}
            passLabel={i.colPass}
            failLabel={i.colFail}
            empty={i.chartEmpty}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40 xl:col-span-2">
          <div>
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{i.chartBands}</h3>
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{i.chartBandsHint}</p>
          </div>
          <BandBars people={data.leaderboard} labels={bandLabels} empty={i.chartEmpty} />
        </section>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", portalHeading)}>
            <BarChart3 size={14} /> {i.questionsTitle}
          </h3>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {sortDir === "asc" ? i.sortHardest : i.sortEasiest}
          </button>
        </div>
        <QuestionTable items={questions} labels={i} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-2">
          <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", portalHeading)}>
            <Trophy size={14} /> {isHiring ? i.leaderboardApplicants : i.leaderboardTitle}
          </h3>
          {data.leaderboard.length === 0 ? (
            <EmptyHint title={i.emptyTitle} body={i.emptyBody} />
          ) : (
            <LeaderboardBars
              items={data.leaderboard}
              isHiring={isHiring}
              official={i.official}
              practice={h.practiceOnlyBadge}
              attemptsLabel={i.colAttempts}
            />
          )}
        </section>

        <section className="space-y-2">
          <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", portalHeading)}>
            <Users size={14} /> {i.recentTitle}
          </h3>
          {data.recentAttempts.length === 0 ? (
            <EmptyHint title={i.emptyTitle} body={i.emptyBody} />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950/40">
              {data.recentAttempts.map((row) => (
                <li key={row.sessionId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/hr/candidates/${row.candidateUserId}/sessions/${row.sessionId}`}
                      className={cn("block truncate text-sm font-medium hover:underline", portalHeading)}
                    >
                      {row.candidateName || "—"}
                    </Link>
                    <p className={cn("text-[11px]", portalSubtext)}>
                      {row.completedAt ? formatRelativeTime(row.completedAt, lang) : "—"}
                      {isHiring ? ` · ${row.isOfficialTest ? i.official : h.practiceOnlyBadge}` : ""}
                    </p>
                  </div>
                  <ScorePill score={row.overallScore} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {loading && (
        <p className={cn("flex items-center gap-1.5 text-xs", portalSubtext)}>
          <Loader2 size={12} className="animate-spin" /> {i.loading}
        </p>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: number | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p
        className={cn("mt-2 text-2xl font-bold tabular-nums", portalHeading)}
        style={accent != null ? { color: getScoreBandHex(accent) } : undefined}
      >
        {value}
      </p>
      <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{sub}</p>
    </div>
  );
}

function PassRing({ rate }: { rate: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, rate));
  return (
    <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r={r} fill="none" className="stroke-gray-200 dark:stroke-gray-800" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={PASS}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${c * clamped} ${c}`}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

function QuestionPassChart({
  items,
  passLabel,
  failLabel,
  empty,
}: {
  items: QuestionInsightItem[];
  passLabel: string;
  failLabel: string;
  empty: string;
}) {
  const chart = useChartTheme();
  const rows = items
    .filter((q) => q.evaluatedCount > 0)
    .map((q) => ({
      label: `#${q.order}`,
      pass: q.passCount,
      fail: Math.max(0, q.evaluatedCount - q.passCount),
      text: clip(q.questionText),
      rate: pct(q.passRate),
    }));

  if (rows.length === 0) {
    return <p className={cn("py-8 text-center text-xs", portalSubtext)}>{empty}</p>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-sm" style={{ background: PASS }} /> {passLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
          <span className="h-2 w-2 rounded-sm" style={{ background: FAIL }} /> {failLabel}
        </span>
      </div>
      <div style={{ height: Math.max(220, rows.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: chart.axisTickFill }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={36} tick={{ fontSize: 11, fill: chart.axisTickFill }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof rows)[number];
                return (
                  <div
                    className="max-w-xs rounded-lg px-3 py-2 text-xs shadow-md"
                    style={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}` }}
                  >
                    <p className="font-semibold">{row.label} · {row.rate}</p>
                    <p className="mt-1 leading-snug opacity-80">{row.text}</p>
                    <p className="mt-1 tabular-nums">
                      {passLabel} {row.pass} · {failLabel} {row.fail}
                    </p>
                  </div>
                );
              }}
              cursor={{ fill: chart.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
            />
            <Bar dataKey="pass" stackId="q" fill={PASS} name={passLabel} />
            <Bar dataKey="fail" stackId="q" fill={FAIL} name={failLabel} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BandBars({
  people,
  labels,
  empty,
}: {
  people: LeaderboardItem[];
  labels: Record<(typeof BANDS)[number]["id"], string>;
  empty: string;
}) {
  const counts = BANDS.map((band) => ({
    ...band,
    label: labels[band.id],
    count: people.filter((p) => p.bestOverallScore >= band.min && p.bestOverallScore <= band.max).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  if (people.length === 0) {
    return <p className={cn("py-8 text-center text-xs", portalSubtext)}>{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {counts.map((band) => (
        <li key={band.id}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className={cn("font-semibold", portalHeading)}>{band.label}</span>
            <span className={cn("tabular-nums", portalSubtext)}>{band.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full"
              style={{ width: `${(band.count / max) * 100}%`, background: band.fill, minWidth: band.count > 0 ? 8 : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LeaderboardBars({
  items,
  isHiring,
  official,
  practice,
  attemptsLabel,
}: {
  items: LeaderboardItem[];
  isHiring: boolean;
  official: string;
  practice: string;
  attemptsLabel: string;
}) {
  return (
    <ol className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950/40">
      {items.map((row) => (
        <li key={row.candidateUserId}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <Link href={`/hr/candidates/${row.candidateUserId}`} className={cn("min-w-0 truncate text-sm font-medium hover:underline", portalHeading)}>
              <span className={cn("mr-1.5 tabular-nums text-[11px]", portalSubtext)}>{row.rank}</span>
              {row.candidateName || "—"}
            </Link>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: getScoreBandHex(row.bestOverallScore) }}>
              {row.bestOverallScore.toFixed(1)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, row.bestOverallScore))}%`, background: getScoreBandHex(row.bestOverallScore) }}
            />
          </div>
          <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>
            {attemptsLabel} {row.attemptCount}
            {isHiring ? ` · ${row.isOfficialTest ? official : practice}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className={cn("tabular-nums text-sm", portalSubtext)}>—</span>;
  const color = getScoreBandHex(score);
  return (
    <span
      className="shrink-0 rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums"
      style={{ color, background: `${color}22` }}
    >
      {score.toFixed(1)}
    </span>
  );
}

function QuestionTable({
  items,
  labels,
}: {
  items: QuestionInsightItem[];
  labels: {
    colQuestion: string;
    colEvaluated: string;
    colAvg: string;
    colPass: string;
    colFail: string;
    tooEasy: string;
    tooHard: string;
    noQuestions: string;
  };
}) {
  if (items.length === 0) {
    return <EmptyHint title={labels.noQuestions} body="" />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
            <th className="px-3 py-2">{labels.colQuestion}</th>
            <th className="px-3 py-2">{labels.colEvaluated}</th>
            <th className="px-3 py-2">{labels.colAvg}</th>
            <th className="min-w-36 px-3 py-2">{labels.colPass}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.questionId} className="border-b border-gray-50 align-top last:border-0 dark:border-gray-900">
              <td className="max-w-md px-3 py-2.5">
                <p className={cn("line-clamp-2 text-sm", portalHeading)}>{q.questionText}</p>
                <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>
                  #{q.order}
                  {q.skill ? ` · ${q.skill}` : ""}
                  {q.difficulty ? ` · ${q.difficulty}` : ""}
                </p>
                {q.qualityFlag && (
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      q.qualityFlag === "tooEasy"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    )}
                  >
                    {q.qualityFlag === "tooEasy" ? labels.tooEasy : labels.tooHard}
                  </span>
                )}
              </td>
              <td className={cn("px-3 py-2.5 tabular-nums", portalSubtext)}>{q.evaluatedCount}</td>
              <td className={cn("px-3 py-2.5 tabular-nums", portalHeading)}>{scoreText(q.averageScore)}</td>
              <td className="px-3 py-2.5">
                <RatioBar
                  passRate={q.evaluatedCount === 0 ? null : q.passRate}
                  passLabel={labels.colPass}
                  failLabel={labels.colFail}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatioBar({ passRate, passLabel, failLabel }: { passRate: number | null; passLabel: string; failLabel: string }) {
  if (passRate == null) {
    return <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />;
  }
  const pass = Math.round(Math.max(0, Math.min(1, passRate)) * 100);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div style={{ width: `${pass}%`, background: PASS }} />
        <div style={{ width: `${100 - pass}%`, background: FAIL }} />
      </div>
      <p className={cn("mt-1 text-[10px] tabular-nums", portalSubtext)}>
        {passLabel} {pass}% · {failLabel} {100 - pass}%
      </p>
    </div>
  );
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-800">
      <p className={cn("text-sm font-medium", portalHeading)}>{title}</p>
      {body ? <p className={cn("mt-1 text-xs", portalSubtext)}>{body}</p> : null}
    </div>
  );
}
