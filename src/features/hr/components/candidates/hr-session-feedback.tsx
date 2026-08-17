"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage, type Lang } from "@/shared/providers/language-context";
import { portalHeadingAlt, portalSubtext, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { CategoryPill, Pill, getScoreBadgeClass, getScoreLevel } from "@/features/candidate/components/ui/pill";
import { translateDimensionKey, translateQuestionCategory } from "@/features/candidate/utils/skill-labels";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { FeedbackRadarChart } from "@/features/candidate/components/feedback/feedback-radar-chart";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import {
  getHrSessionFeedback,
  type HrSessionFeedback,
  type HrSessionFeedbackItem,
} from "@/features/hr/services/hr-candidate.service";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

function getSkillColor(score: number) {
  if (score >= 80) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" };
  if (score >= 65) return { bar: "bg-violet-500", text: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" };
  if (score >= 50) return { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" };
  return { bar: "bg-red-500", text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" };
}

function aggregateDimensionScores(items: HrSessionFeedbackItem[], lang: Lang): { skill: string; score: number }[] | null {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const item of items) {
    if (!item.dimensionScores) continue;
    for (const [key, value] of Object.entries(item.dimensionScores)) {
      sums[key] ??= { total: 0, count: 0 };
      sums[key].total += value;
      sums[key].count += 1;
    }
  }
  const keys = Object.keys(sums);
  if (keys.length === 0) return null;
  return keys.map((key) => ({
    skill: translateDimensionKey(key, lang),
    score: Math.round(sums[key].total / sums[key].count),
  }));
}

export function HrSessionFeedbackPage({ candidateUserId, sessionId }: { candidateUserId: string; sessionId: string }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const p = t.hrSessionFeedbackPage;
  const fb = t.jobseekerFeedbackPage;
  const [data, setData] = useState<HrSessionFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"load" | "forbidden" | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHrSessionFeedback(sessionId);
      setData(res);
      setExpandedIds(new Set(res.items.slice(0, 1).map((i) => i.questionId)));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 403 ? "forbidden" : "load");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const radarData = useMemo(
    () => (data ? aggregateDimensionScores(data.items, lang) : null),
    [data, lang]
  );

  const insightText = lang === "vi" ? data?.aiInsight?.vi : data?.aiInsight?.en;
  const skills = lang === "vi" ? data?.aiInsight?.skillsToImproveVi : data?.aiInsight?.skillsToImproveEn;
  const score = data?.overallScore;
  const level = score != null ? getScoreLevel(score, fb.scoreLevels) : null;

  const content = (() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
          <AiLoadingSpinner text={p.loading} />
        </div>
      );
    }
    if (error || !data) {
      return (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-sm", portalSubtext)}>
            {error === "forbidden" ? p.forbidden : p.loadFailed}
          </p>
          <button type="button" onClick={() => void fetchData()}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <RefreshCw size={13} /> {p.retryBtn}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn("inline-flex items-center gap-1.5 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors", portalSubtext)}
        >
          <ArrowLeft size={14} /> {p.back}
        </button>

        <div className="hr-glass-card p-5 sm:p-6">
          <p className={cn("text-[12px] font-semibold uppercase tracking-wide mb-1", portalSubtextAlt)}>{p.heading}</p>
          <div className="flex items-end gap-3 flex-wrap">
            <span className={cn("text-4xl font-extrabold tabular-nums", portalHeadingAlt)}>
              {score != null ? Math.round(score) : "—"}
            </span>
            <span className={cn("text-sm pb-1", portalSubtext)}>{fb.scoreOutOf}</span>
            {level && (
              <Pill className={cn("mb-1", level.badgeClass)}>{level.label}</Pill>
            )}
          </div>
        </div>

        {insightText && (
          <div className="hr-glass-card p-5 sm:p-6">
            <h2 className={cn("text-[15px] font-bold mb-2", portalHeadingAlt)}>{fb.aiInsight}</h2>
            <p className={cn("text-[13px] leading-6", portalSubtext)}>{insightText}</p>
            {skills && skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.map((s) => (
                  <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {radarData && (
          <div className="hr-glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                  <Target size={15} className="text-primary" />
                </div>
                <div>
                  <h2 className={cn("text-[15px] font-bold leading-tight", portalHeadingAlt)}>{fb.skillBreakdown}</h2>
                  <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{fb.skillBreakdownSubtitle}</p>
                </div>
              </div>
              <div className="text-[12px] font-bold px-3 py-1 rounded-full border bg-violet-50 dark:bg-violet-950/40 text-primary border-violet-200 dark:border-violet-800/40">
                {fb.skillBreakdownAvgPrefix} {Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length)}%
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
              <div className="w-full md:w-[52%] shrink-0">
                <FeedbackRadarChart data={radarData} />
              </div>
              <div className="w-full md:flex-1 space-y-3.5">
                {[...radarData].sort((a, b) => b.score - a.score).map((item, i) => {
                  const c = getSkillColor(item.score);
                  return (
                    <div key={item.skill}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{item.skill}</span>
                        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", c.bg, c.text)}>{item.score}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", c.bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <h2 className={cn("text-[20px] font-[700]", portalHeadingAlt)}>{fb.questionReviews}</h2>
        {data.items.map((item, i) => {
          const isExpanded = expandedIds.has(item.questionId);
          const hasEval = item.evaluationStatus === "Succeeded" && item.score != null;
          return (
            <div key={item.questionId} className="hr-glass-card p-6">
              <button
                type="button"
                onClick={() => {
                  setExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.questionId)) next.delete(item.questionId);
                    else next.add(item.questionId);
                    return next;
                  });
                }}
                className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <CategoryPill
                      category={item.questionType}
                      label={translateQuestionCategory(item.questionType, lang)}
                    />
                    <span className={cn("text-[12px]", portalSubtextAlt)}>Q{i + 1}</span>
                    {hasEval && (
                      <Pill className={cn("text-[11px] font-[700] px-2 py-0.5 ml-auto", getScoreBadgeClass(item.score as number))}>
                        {item.score}%
                      </Pill>
                    )}
                  </div>
                  <QuestionContent text={item.questionText} className={cn("text-[15px] font-bold leading-6", portalHeadingAlt)} />
                </div>
                <ChevronDown
                  size={16}
                  className={cn("text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 mt-1", isExpanded && "rotate-180")}
                />
              </button>
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className={cn("text-[12px] font-semibold mb-1.5", portalSubtextAlt)}>{fb.yourAnswer}</p>
                    {item.answerText ? (
                      <QuestionContent text={item.answerText} className={cn("text-[13px] leading-6", portalSubtext)} />
                    ) : (
                      <p className={cn("text-[13px] italic", portalSubtext)}>{fb.noAnswer}</p>
                    )}
                  </div>
                  {hasEval && (
                    <div className="space-y-3">
                      {item.strengths.length > 0 && (
                        <div>
                          <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                            <CheckCircle2 size={13} /> {fb.strengths}
                          </p>
                          <ul className={cn("list-disc pl-5 text-[13px] space-y-1", portalSubtext)}>
                            {item.strengths.map((s) => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {item.improvements.length > 0 && (
                        <div>
                          <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-1">{fb.improvements}</p>
                          <ul className={cn("list-disc pl-5 text-[13px] space-y-1", portalSubtext)}>
                            {item.improvements.map((s) => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {item.suggestion && (
                        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-3">
                          <p className="text-[12px] font-semibold text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-1">
                            <Lightbulb size={13} /> {fb.suggestion}
                          </p>
                          <p className={cn("text-[13px] leading-6", portalSubtext)}>{item.suggestion}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <Link
          href={`/hr/candidates/${candidateUserId}`}
          className="inline-flex text-sm font-semibold text-primary hover:underline"
        >
          {p.backToOverview}
        </Link>
      </div>
    );
  })();

  return (
    <AppShell
      pageTitle={p.heading}
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        { label: t.hrCandidateOverviewPage.heading, href: `/hr/candidates/${candidateUserId}` },
        { label: p.heading },
      ]}
      fullWidth
    >
      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[12rem]">
          <Loader2 className="animate-spin text-primary" size={22} />
        </div>
      ) : content}
    </AppShell>
  );
}
