"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, animate, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Share2, Loader2,
  Sparkles, ChevronDown, CheckCircle2, AlertTriangle, Lightbulb, Target,
  TrendingUp, TrendingDown, Minus, BookOpen, Flame,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage, type Lang } from "@/shared/providers/language-context";
import type { PracticeSessionDetail, AnswerEvaluation } from "@/features/candidate/services/practice-session.service";
import { CategoryPill, Pill, getScoreLevel, getScoreBadgeClass } from "@/features/candidate/components/ui/pill";
import { translateDimensionKey, translateQuestionCategory } from "@/features/candidate/utils/skill-labels";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { ConfettiBurst } from "@/shared/components/common/confetti-burst";
import { FeedbackRadarChart } from "./feedback-radar-chart";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const CELEBRATION_THRESHOLD = 80;

function getSkillColor(score: number) {
  if (score >= 80) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", ring: "#10B981" };
  if (score >= 65) return { bar: "bg-violet-500", text: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", ring: "#6C47FF" };
  if (score >= 50) return { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", ring: "#F59E0B" };
  return { bar: "bg-red-500", text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40", ring: "#EF4444" };
}

/** Averages each dimension key (clarity/depth/structure/relevance, ...) across
 * every question that has a dimensionScores breakdown. Returns null if none do —
 * the radar chart section is simply omitted rather than showing fabricated data. */
function aggregateDimensionScores(feedback: Record<string, AnswerEvaluation>, lang: Lang): { skill: string; score: number }[] | null {
  const sums: Record<string, { total: number; count: number }> = {};
  Object.values(feedback).forEach((fb) => {
    if (!fb.dimensionScores) return;
    Object.entries(fb.dimensionScores).forEach(([key, value]) => {
      sums[key] ??= { total: 0, count: 0 };
      sums[key].total += value;
      sums[key].count += 1;
    });
  });
  const keys = Object.keys(sums);
  if (keys.length === 0) return null;
  return keys.map((key) => ({
    skill: translateDimensionKey(key, lang),
    score: Math.round(sums[key].total / sums[key].count),
  }));
}

/**
 * Evidence-based executive summary — cites the actual weakest/strongest scored
 * question (real AI-generated strengths/improvements text) instead of a generic
 * canned sentence. Returns null when no question has been scored yet.
 */
interface ExecutiveSummary {
  strongPoint: string | null;
  focusPoint: string | null;
}

function buildExecutiveSummary(
  session: PracticeSessionDetail,
  feedback: Record<string, AnswerEvaluation>,
  labels: { strongTemplate: string; focusTemplate: string },
  lang: Lang
): ExecutiveSummary | null {
  const scored = session.questions
    .map((q) => ({ q, fb: feedback[q.id] }))
    .filter((x): x is { q: typeof x.q; fb: AnswerEvaluation } => Boolean(x.fb) && x.fb.evaluationStatus === "Succeeded" && x.fb.score !== null);

  if (scored.length === 0) return null;

  const sorted = [...scored].sort((a, b) => (b.fb.score as number) - (a.fb.score as number));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const strongPoint =
    best.fb.strengths.length > 0
      ? labels.strongTemplate
          .replace("{{category}}", translateQuestionCategory(best.q.questionType, lang))
          .replace("{{score}}", String(best.fb.score))
          .replace("{{detail}}", best.fb.strengths[0])
      : null;

  const focusPoint =
    worst.fb.improvements.length > 0 && worst.q.id !== best.q.id
      ? labels.focusTemplate
          .replace("{{category}}", translateQuestionCategory(worst.q.questionType, lang))
          .replace("{{score}}", String(worst.fb.score))
          .replace("{{detail}}", worst.fb.improvements[0])
      : null;

  return { strongPoint, focusPoint };
}

interface ActionPlanItem {
  category: string;
  score: number;
  improvement: string;
}

function buildActionPlan(
  session: PracticeSessionDetail,
  feedback: Record<string, AnswerEvaluation>,
  lang: Lang
): ActionPlanItem[] | null {
  const scored = session.questions
    .map((q) => ({ q, fb: feedback[q.id] }))
    .filter(
      (x): x is { q: typeof x.q; fb: AnswerEvaluation } =>
        Boolean(x.fb) &&
        x.fb.evaluationStatus === "Succeeded" &&
        x.fb.score !== null &&
        x.fb.improvements.length > 0
    )
    .sort((a, b) => (a.fb.score as number) - (b.fb.score as number))
    .slice(0, 3);

  if (scored.length === 0) return null;

  return scored.map(({ q, fb }) => ({
    category: translateQuestionCategory(q.questionType, lang),
    score: fb.score as number,
    improvement: fb.improvements[0],
  }));
}

function ScoreRing({ score, trackStroke }: { score: number; trackStroke: string }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 65 ? "#6C47FF" : "#F59E0B";
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [score]);

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke={trackStroke} strokeWidth="10" />
        <motion.circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-[32px] font-[800] leading-none tabular-nums", portalHeadingAlt)}>
          {displayScore}
        </span>
        <span className={cn("text-[11px] font-[500]", portalSubtextAlt)}>/ 100</span>
      </div>
    </div>
  );
}

function PendingScoreRing({ scoring, trackStroke }: { scoring: boolean; trackStroke: string }) {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={52} fill="none" stroke={trackStroke} strokeWidth="10" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        {scoring ? <Loader2 size={20} className="animate-spin text-primary" /> : <span className="text-[24px]">—</span>}
      </div>
    </div>
  );
}

interface FeedbackPageProps {
  session: PracticeSessionDetail;
  feedback: Record<string, AnswerEvaluation>;
  scoring: boolean;
  setTitle?: string;
  companyName?: string;
  /** Score of the most recent other completed attempt of this same set — undefined while still loading, null when there isn't one. */
  previousScore?: number | null;
}

export function FeedbackPage({ session, feedback, scoring, setTitle, companyName, previousScore }: FeedbackPageProps) {
  const { t, lang } = useLanguage();
  const p = t.jobseekerFeedbackPage;
  const chart = useChartTheme();
  const { addToast } = useToast();
  const hasScore = session.overallScore !== null;
  const score = session.overallScore ?? 0;
  const { label: scoreLevelLabel, badgeClass: scoreLevelBadgeClass } = getScoreLevel(score, p.scoreLevels);

  const answeredQuestions = session.questions.filter((q) => q.answerText);
  const feedbackByQuestionId = new Map(Object.entries(feedback));
  const radarData = aggregateDimensionScores(feedback, lang);
  const executiveSummary = buildExecutiveSummary(session, feedback, p.executiveSummary, lang);
  const actionPlan = buildActionPlan(session, feedback, lang);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(answeredQuestions.length > 0 ? [answeredQuestions[0].id] : [])
  );

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      addToast("success", p.shareCopied);
    } catch {
      addToast("error", p.shareFailed);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const aiInsight = hasScore
    ? (score >= 80 ? p.insightExcellent : score >= 65 ? p.insightGood : p.insightNeedsWork)
    : null;

  const companyInitials = companyName ? getCompanyInitials(companyName) : "";
  const companyColor = companyName ? getCompanyColor(companyName) : "bg-gray-400";

  return (
    <div className="w-full">
      {/* Back */}
      <Link
        href="/jobseeker/history"
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] font-[500] hover:text-primary transition-colors mb-6",
          portalSubtextAlt
        )}
      >
        <ArrowLeft size={14} />
        {p.backToHistory}
      </Link>

      {/* ── Score Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative hr-glass-card rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-10 mb-6"
      >
        {hasScore && score >= CELEBRATION_THRESHOLD && <ConfettiBurst />}
        {hasScore ? (
          <ScoreRing score={score} trackStroke={chart.isDark ? "#374151" : "#F3F4F6"} />
        ) : (
          <PendingScoreRing scoring={scoring} trackStroke={chart.isDark ? "#374151" : "#F3F4F6"} />
        )}

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className={cn("text-[24px] font-[800]", portalHeadingAlt)}>{p.overallScore}</h1>
            {hasScore && (
              <span className={cn("text-[12px] font-[700] px-3 py-1 rounded-full", scoreLevelBadgeClass)}>
                {scoreLevelLabel}
              </span>
            )}
            {hasScore && previousScore !== undefined && (
              previousScore === null ? (
                <span className={cn("text-[11px]", portalSubtextAlt)}>{p.comparisonUnavailable}</span>
              ) : (() => {
                const delta = Math.round(score - previousScore);
                const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                const color = delta > 0 ? "text-emerald-600 dark:text-emerald-400" : delta < 0 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500";
                return (
                  <span className={cn("flex items-center gap-1 text-[12px] font-[700]", color)}>
                    <Icon size={12} />
                    {delta > 0 ? "+" : ""}{delta}% {p.comparisonVsLast}
                  </span>
                );
              })()
            )}
          </div>

          {(setTitle || companyName) && (
            <div className="flex items-center gap-2 mb-4">
              {companyName && (
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold", companyColor)}>
                  {companyInitials}
                </div>
              )}
              <p className={cn("text-[14px]", portalSubtextAlt)}>
                {[setTitle, companyName].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}

          {/* AI Insight / pending state */}
          <div className="hr-quick-generate rounded-lg p-4 flex gap-3">
            {hasScore ? (
              <>
                <Sparkles size={15} className="text-[#7C3AED] dark:text-[#a78bff] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-[12px] font-[700] text-primary mb-1">{p.aiInsight}</p>
                    <p className={cn("text-[13px] leading-[20px]", portalHeadingAlt)}>{aiInsight}</p>
                  </div>
                  {executiveSummary?.strongPoint && (
                    <p className={cn("text-[12px] leading-[18px] flex items-start gap-1.5", portalSubtextAlt)}>
                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      {executiveSummary.strongPoint}
                    </p>
                  )}
                  {executiveSummary?.focusPoint && (
                    <p className={cn("text-[12px] leading-[18px] flex items-start gap-1.5", portalSubtextAlt)}>
                      <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      {executiveSummary.focusPoint}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {scoring ? (
                  <Loader2 size={15} className="animate-spin text-primary shrink-0 mt-0.5" />
                ) : (
                  <Sparkles size={15} className="text-[#7C3AED] dark:text-[#a78bff] shrink-0 mt-0.5" />
                )}
                <p className={cn("text-[13px] leading-[20px]", portalHeadingAlt)}>
                  {scoring ? p.scoringInProgress : p.scoreNotAvailable}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
          {session.questionSetId && (
            <Link
              href={`/jobseeker/practice/${session.questionSetId}`}
              className="shimmer-button flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg"
            >
              <RefreshCw size={13} />
              {p.retryBtn}
            </Link>
          )}
          <button
            type="button"
            onClick={handleShare}
            className={cn(
              "hr-glass-card flex items-center gap-2 h-9 px-4 text-[13px] font-semibold hover:border-[#7C3AED]/30",
              portalHeadingAlt
            )}
          >
            <Share2 size={13} />
            {p.shareBtn}
          </button>
        </div>
      </motion.div>

      {/* ── Skill Breakdown (radar) — only when at least one question has dimension scores ── */}
      {radarData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hr-glass-card p-5 sm:p-6 mb-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                <Target size={15} className="text-primary" />
              </div>
              <div>
                <h2 className={cn("text-[15px] font-bold leading-tight", portalHeadingAlt)}>{p.skillBreakdown}</h2>
                <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.skillBreakdownSubtitle}</p>
              </div>
            </div>
            <div className={cn(
              "text-[12px] font-bold px-3 py-1 rounded-full border",
              "bg-violet-50 dark:bg-violet-950/40 text-primary border-violet-200 dark:border-violet-800/40"
            )}>
              {p.skillBreakdownAvgPrefix} {Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length)}%
            </div>
          </div>

          {/* Body: chart + skill list */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
            {/* Radar chart */}
            <div className="w-full md:w-[52%] shrink-0">
              <FeedbackRadarChart data={radarData} />
            </div>

            {/* Skill score bars */}
            <div className="w-full md:flex-1 space-y-3.5">
              {[...radarData].sort((a, b) => b.score - a.score).map((item, i) => {
                const c = getSkillColor(item.score);
                return (
                  <div key={item.skill}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{item.skill}</span>
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", c.bg, c.text)}>
                        {item.score}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", c.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 0.9, delay: 0.35 + i * 0.08, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Action Plan ──────────────────────────────────────────── */}
      {hasScore && actionPlan && actionPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="hr-glass-card p-5 sm:p-6 mb-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <Flame size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className={cn("text-[15px] font-bold leading-tight", portalHeadingAlt)}>{p.actionPlanTitle}</h2>
              <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.actionPlanSubtitle}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {actionPlan.map((item, i) => {
              const c = getSkillColor(item.score);
              const rankColors = [
                "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
                "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
                "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
              ];
              return (
                <div
                  key={`${item.category}-${i}`}
                  className="flex gap-3 items-start p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50"
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold",
                    rankColors[i] ?? rankColors[2]
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[12px] font-bold", portalHeadingAlt)}>{item.category}</span>
                      <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-full", c.bg, c.text)}>
                        {item.score}%
                      </span>
                    </div>
                    <p className={cn("text-[12px] leading-4.5", portalSubtextAlt)}>
                      {item.improvement}
                    </p>
                  </div>
                  <BookOpen size={14} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Question Reviews ─────────────────────────────────────── */}
      {answeredQuestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-4"
        >
          <h2 className={cn("text-[20px] font-[700]", portalHeadingAlt)}>{p.questionReviews}</h2>
          {answeredQuestions.map((q, i) => {
            const isExpanded = expandedIds.has(q.id);
            const fb = feedbackByQuestionId.get(q.id);
            const hasEval = fb && fb.evaluationStatus === "Succeeded" && fb.score !== null;
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="hr-glass-card p-6"
              >
                {/* Question header — always-visible summary, click to expand */}
                <button
                  onClick={() => toggleExpanded(q.id)}
                  className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryPill category={q.questionType} label={translateQuestionCategory(q.questionType, lang)} />
                      <span className={cn("text-[12px]", portalSubtextAlt)}>Q{i + 1}</span>
                      {hasEval && (
                        <Pill className={cn("text-[11px] font-[700] px-2 py-0.5 ml-auto", getScoreBadgeClass(fb.score as number))}>
                          {fb.score}%
                        </Pill>
                      )}
                    </div>
                    <QuestionContent text={q.question} className={cn("text-[15px] font-bold leading-6", portalHeadingAlt)} />
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn("text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 mt-1", isExpanded && "rotate-180")}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-5 flex flex-col gap-4">
                        {/* Your answer */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700/50">
                          <p className={cn("text-[11px] font-[700] uppercase tracking-wide mb-2", portalSubtextAlt)}>{p.yourAnswer}</p>
                          <QuestionContent text={q.answerText ?? ""} className={cn("text-[13px] leading-[22px]", portalHeadingAlt)} />
                        </div>

                        {/* AI evaluation — only when this question's evaluation actually succeeded */}
                        {hasEval && (
                          <div className="flex flex-col gap-3">
                            <p className={cn("text-[11px] font-[700] uppercase tracking-wide", portalSubtextAlt)}>{p.aiEvaluation}</p>

                            {fb.strengths.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <p className="flex items-center gap-1.5 text-[12px] font-[700] text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 size={13} />
                                  {p.strengths}
                                </p>
                                <ul className={cn("text-[13px] leading-[20px] list-disc pl-5", portalHeadingAlt)}>
                                  {fb.strengths.map((s) => <li key={s}>{s}</li>)}
                                </ul>
                              </div>
                            )}

                            {fb.improvements.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <p className="flex items-center gap-1.5 text-[12px] font-[700] text-amber-600 dark:text-amber-400">
                                  <AlertTriangle size={13} />
                                  {p.improvements}
                                </p>
                                <ul className={cn("text-[13px] leading-[20px] list-disc pl-5", portalHeadingAlt)}>
                                  {fb.improvements.map((s) => <li key={s}>{s}</li>)}
                                </ul>
                              </div>
                            )}

                            {fb.suggestion && (
                              <div className="flex items-start gap-2 bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                                <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[12px] font-[700] text-primary mb-1">{p.suggestion}</p>
                                  <p className={cn("text-[13px] leading-[20px]", portalHeadingAlt)}>{fb.suggestion}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
