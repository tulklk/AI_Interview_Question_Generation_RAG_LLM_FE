"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeadingAlt, portalSubtext, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { CategoryPill, Pill, getScoreBadgeClass, getScoreLevel } from "@/features/candidate/components/ui/pill";
import { translateQuestionCategory } from "@/features/candidate/utils/skill-labels";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import {
  getHrSessionFeedback,
  type HrSessionFeedback,
} from "@/features/hr/services/hr-candidate.service";
import { CriterionBreakdown } from "@/features/candidate/components/feedback/criterion-breakdown";
import { HrSessionFeedbackSkeleton } from "./hr-session-feedback-skeleton";

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

  const insightText = lang === "vi" ? data?.aiInsight?.vi : data?.aiInsight?.en;
  const skills = lang === "vi" ? data?.aiInsight?.skillsToImproveVi : data?.aiInsight?.skillsToImproveEn;
  const score = data?.overallScore;
  const level = score != null ? getScoreLevel(score, fb.scoreLevels) : null;

  const content = (() => {
    if (loading) {
      return <HrSessionFeedbackSkeleton />;
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
                      {item.criterionScores && <CriterionBreakdown criteria={item.criterionScores} total={item.score} />}
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
        <HrSessionFeedbackSkeleton />
      ) : content}
    </AppShell>
  );
}
