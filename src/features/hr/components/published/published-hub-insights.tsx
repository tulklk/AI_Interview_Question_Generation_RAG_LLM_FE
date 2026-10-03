"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/cn";
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

const PASS = "#10B981";
const FAIL = "#F43F5E";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function scoreText(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
}

function passLabel(template: string, pass: number, total: number): string {
  return template.replace("{{pass}}", String(pass)).replace("{{total}}", String(total));
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

  const graded = useMemo(
    () => (data?.questions ?? []).filter((q) => q.evaluatedCount > 0),
    [data?.questions]
  );
  const mostWrong = useMemo(
    () => [...graded].sort((a, b) => b.failRate - a.failRate || b.evaluatedCount - a.evaluatedCount || a.order - b.order),
    [graded]
  );
  const mostRight = useMemo(
    () => [...graded].sort((a, b) => b.passRate - a.passRate || b.evaluatedCount - a.evaluatedCount || a.order - b.order),
    [graded]
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
  const [first, ...rest] = data.leaderboard;

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
        <Kpi label={h.metricAvgScore} value={scoreText(summary.averageScore)} sub={h.metricAvgScoreSub} />
        <Kpi label={i.metricPass} value={pct(summary.passRateOverall)} sub={i.metricPassSub} />
        <Kpi label={i.metricEvaluated} value={String(summary.evaluatedAnswerCount)} sub={i.metricEvaluatedSub} />
      </div>

      <section className="space-y-3">
        <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", portalHeading)}>
          <Trophy size={14} /> {isHiring ? i.leaderboardApplicants : i.leaderboardTitle}
        </h3>
        {!first ? (
          <EmptyHint title={i.emptyTitle} body={i.emptyBody} />
        ) : (
          <div className="space-y-2">
            <TopCandidate
              person={first}
              title={i.topCandidate}
              passOf={i.passOf}
              attemptsLabel={i.colAttempts}
              isHiring={isHiring}
              official={i.official}
              practice={h.practiceOnlyBadge}
            />
            {rest.length > 0 && (
              <ol className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
                {rest.map((row) => (
                  <li key={row.candidateUserId} className="border-b border-gray-100 px-3 py-2.5 last:border-0 dark:border-gray-800">
                    <RankRow
                      person={row}
                      passOf={i.passOf}
                      attemptsLabel={i.colAttempts}
                      isHiring={isHiring}
                      official={i.official}
                      practice={h.practiceOnlyBadge}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <QuestionRankList
          title={i.mostWrong}
          tone="fail"
          items={mostWrong}
          empty={i.noGraded}
          rate={(q) => q.failRate}
          count={(q) => q.evaluatedCount - q.passCount}
        />
        <QuestionRankList
          title={i.mostRight}
          tone="pass"
          items={mostRight}
          empty={i.noGraded}
          rate={(q) => q.passRate}
          count={(q) => q.passCount}
        />
      </div>

      <section className="space-y-2">
        <h3 className={cn("text-sm font-semibold", portalHeading)}>{i.questionsTitle}</h3>
        <QuestionTable items={[...(data.questions ?? [])].sort((a, b) => a.order - b.order)} labels={i} />
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
                <span className={cn("shrink-0 tabular-nums text-sm font-semibold", portalHeading)}>
                  {scoreText(row.overallScore)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {loading && (
        <p className={cn("flex items-center gap-1.5 text-xs", portalSubtext)}>
          <Loader2 size={12} className="animate-spin" /> {i.loading}
        </p>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", portalHeading)}>{value}</p>
      <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{sub}</p>
    </div>
  );
}

function TopCandidate({
  person,
  title,
  passOf,
  attemptsLabel,
  isHiring,
  official,
  practice,
}: {
  person: LeaderboardItem;
  title: string;
  passOf: string;
  attemptsLabel: string;
  isHiring: boolean;
  official: string;
  practice: string;
}) {
  const ratio = person.evaluatedCount === 0 ? 0 : person.passCount / person.evaluatedCount;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{title}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">#{person.rank}</p>
          <Link href={`/hr/candidates/${person.candidateUserId}`} className={cn("block truncate text-xl font-bold hover:underline", portalHeading)}>
            {person.candidateName || "—"}
          </Link>
          <p className={cn("mt-1 text-sm font-semibold", portalHeading)}>
            {passLabel(passOf, person.passCount, person.evaluatedCount)}
          </p>
          <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>
            {attemptsLabel} {person.attemptCount}
            {isHiring ? ` · ${person.isOfficialTest ? official : practice}` : ""}
          </p>
        </div>
        <p className="text-3xl font-bold tabular-nums" style={{ color: getScoreBandHex(person.bestOverallScore) }}>
          {person.bestOverallScore.toFixed(1)}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-gray-900">
        <div className="h-full rounded-full" style={{ width: `${Math.round(ratio * 100)}%`, background: PASS }} />
      </div>
    </div>
  );
}

function RankRow({
  person,
  passOf,
  attemptsLabel,
  isHiring,
  official,
  practice,
}: {
  person: LeaderboardItem;
  passOf: string;
  attemptsLabel: string;
  isHiring: boolean;
  official: string;
  practice: string;
}) {
  const ratio = person.evaluatedCount === 0 ? 0 : person.passCount / person.evaluatedCount;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/hr/candidates/${person.candidateUserId}`} className={cn("min-w-0 truncate text-sm font-medium hover:underline", portalHeading)}>
          <span className={cn("mr-1.5 tabular-nums text-[11px]", portalSubtext)}>#{person.rank}</span>
          {person.candidateName || "—"}
        </Link>
        <span className={cn("shrink-0 text-xs font-semibold tabular-nums", portalHeading)}>
          {passLabel(passOf, person.passCount, person.evaluatedCount)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full" style={{ width: `${Math.round(ratio * 100)}%`, background: PASS }} />
      </div>
      <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>
        {person.bestOverallScore.toFixed(1)} · {attemptsLabel} {person.attemptCount}
        {isHiring ? ` · ${person.isOfficialTest ? official : practice}` : ""}
      </p>
    </div>
  );
}

function QuestionRankList({
  title,
  tone,
  items,
  empty,
  rate,
  count,
}: {
  title: string;
  tone: "pass" | "fail";
  items: QuestionInsightItem[];
  empty: string;
  rate: (q: QuestionInsightItem) => number;
  count: (q: QuestionInsightItem) => number;
}) {
  const color = tone === "pass" ? PASS : FAIL;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <h3 className="text-sm font-semibold" style={{ color }}>{title}</h3>
      {items.length === 0 ? (
        <p className={cn("py-6 text-center text-xs", portalSubtext)}>{empty}</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {items.map((q, index) => {
            const width = Math.round(Math.max(0, Math.min(1, rate(q))) * 100);
            return (
              <li key={q.questionId}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("min-w-0 text-sm", portalHeading)}>
                    <span className="mr-1.5 tabular-nums text-[11px] text-gray-400">{index + 1}</span>
                    <span className="text-[11px] text-gray-400">#{q.order}</span> {q.questionText}
                  </p>
                  <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>
                    {count(q)}/{q.evaluatedCount} · {width}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
  if (items.length === 0) return <EmptyHint title={labels.noQuestions} body="" />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
            <th className="px-3 py-2">{labels.colQuestion}</th>
            <th className="px-3 py-2">{labels.colEvaluated}</th>
            <th className="px-3 py-2">{labels.colAvg}</th>
            <th className="px-3 py-2">{labels.colPass}</th>
            <th className="px-3 py-2">{labels.colFail}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.questionId} className="border-b border-gray-50 align-top last:border-0 dark:border-gray-900">
              <td className="max-w-md px-3 py-2.5">
                <p className={cn("line-clamp-2 text-sm", portalHeading)}>#{q.order} {q.questionText}</p>
                <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>
                  {q.skill ? q.skill : ""}
                  {q.skill && q.difficulty ? " · " : ""}
                  {q.difficulty || ""}
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
              <td className="px-3 py-2.5 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {q.passCount}/{q.evaluatedCount} · {pct(q.passRate)}
              </td>
              <td className="px-3 py-2.5 tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                {Math.max(0, q.evaluatedCount - q.passCount)}/{q.evaluatedCount} · {pct(q.failRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
