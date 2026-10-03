"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, BarChart3, Loader2, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getQuestionSetInsights,
  type QuestionInsightItem,
  type QuestionSetInsights,
} from "@/features/hr/services/hr-insights.service";
import { PublishedHubInsightsSkeleton } from "./published-skeletons";

type SortDir = "asc" | "desc";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function scoreText(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
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

  if (loading && !data) return <PublishedHubInsightsSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
        <p className={cn("text-sm", portalSubtext)}>{i.loadFailed}</p>
      </div>
    );
  }

  const summary = data.summary;

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
        {[
          { label: isHiring ? h.metricApplicants : h.metricAttempts, value: String(summary.completedCount), sub: i.metricCompletedSub },
          { label: h.metricAvgScore, value: scoreText(summary.averageScore), sub: h.metricAvgScoreSub },
          { label: i.metricPass, value: pct(summary.passRateOverall), sub: i.metricPassSub },
          { label: i.metricEvaluated, value: String(summary.evaluatedAnswerCount), sub: i.metricEvaluatedSub },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{m.label}</p>
            <p className={cn("mt-2 text-2xl font-bold tabular-nums", portalHeading)}>{m.value}</p>
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{m.sub}</p>
          </div>
        ))}
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
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{i.colCandidate}</th>
                    <th className="px-3 py-2">{i.colBest}</th>
                    <th className="px-3 py-2">{i.colAttempts}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row) => (
                    <tr key={row.candidateUserId} className="border-b border-gray-50 last:border-0 dark:border-gray-900">
                      <td className={cn("px-3 py-2 tabular-nums", portalSubtext)}>{row.rank}</td>
                      <td className="px-3 py-2">
                        <Link href={`/hr/candidates/${row.candidateUserId}`} className={cn("font-medium hover:underline", portalHeading)}>
                          {row.candidateName || "—"}
                        </Link>
                        {isHiring && (
                          <span className={cn("ml-2 text-[10px] font-semibold", portalSubtext)}>
                            {row.isOfficialTest ? i.official : h.practiceOnlyBadge}
                          </span>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 tabular-nums font-semibold", portalHeading)}>{row.bestOverallScore.toFixed(1)}</td>
                      <td className={cn("px-3 py-2 tabular-nums", portalSubtext)}>{row.attemptCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  <span className={cn("shrink-0 tabular-nums text-sm font-semibold", portalHeading)}>
                    {scoreText(row.overallScore)}
                  </span>
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
            <th className="px-3 py-2">{labels.colPass}</th>
            <th className="px-3 py-2">{labels.colFail}</th>
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
              <td className={cn("px-3 py-2.5 tabular-nums", portalHeading)}>{pct(q.passRate)}</td>
              <td className={cn("px-3 py-2.5 tabular-nums", portalSubtext)}>{pct(q.failRate)}</td>
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
