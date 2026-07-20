"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, animate, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Share2, Loader2,
  Sparkles, ChevronDown, CheckCircle2, AlertTriangle, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { PracticeSessionDetail, AnswerEvaluation } from "@/features/candidate/services/practice-session.service";
import { CategoryPill, Pill, formatCategoryLabel, getScoreLevel, getScoreBadgeClass } from "@/features/candidate/components/ui/pill";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { ConfettiBurst } from "@/shared/components/common/confetti-burst";
import { FeedbackRadarChart } from "./feedback-radar-chart";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const CELEBRATION_THRESHOLD = 80;

/** Averages each dimension key (clarity/depth/structure/relevance, ...) across
 * every question that has a dimensionScores breakdown. Returns null if none do —
 * the radar chart section is simply omitted rather than showing fabricated data. */
function aggregateDimensionScores(feedback: Record<string, AnswerEvaluation>): { skill: string; score: number }[] | null {
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
    skill: formatCategoryLabel(key),
    score: Math.round(sums[key].total / sums[key].count),
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
}

export function FeedbackPage({ session, feedback, scoring, setTitle, companyName }: FeedbackPageProps) {
  const { t } = useLanguage();
  const p = t.jobseekerFeedbackPage;
  const chart = useChartTheme();
  const { addToast } = useToast();

  const hasScore = session.overallScore !== null;
  const score = session.overallScore ?? 0;
  const { label: scoreLevelLabel, badgeClass: scoreLevelBadgeClass } = getScoreLevel(score, p.scoreLevels);

  const answeredQuestions = session.questions.filter((q) => q.answerText);
  const feedbackByQuestionId = new Map(Object.entries(feedback));
  const radarData = aggregateDimensionScores(feedback);

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
    ? (
      score >= 80
        ? "Outstanding performance! Your answers showed depth and structure. You're well-prepared for this interview level."
        : score >= 65
        ? "Solid performance. Keep refining your answers with clearer structure and specific examples."
        : "Good start! Focus on providing more specific examples and quantifiable outcomes in your answers to boost your score."
    )
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
        className="relative hr-glass-card p-5 sm:p-8 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-10"
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
                <div>
                  <p className="text-[12px] font-[700] text-primary mb-1">{p.aiInsight}</p>
                  <p className={cn("text-[13px] leading-[20px]", portalHeadingAlt)}>{aiInsight}</p>
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
          <h2 className={cn("text-[16px] font-[700] mb-2", portalHeadingAlt)}>{p.skillBreakdown}</h2>
          <FeedbackRadarChart data={radarData} />
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
                      <CategoryPill category={q.questionType} label={formatCategoryLabel(q.questionType)} />
                      <span className={cn("text-[12px]", portalSubtextAlt)}>Q{i + 1}</span>
                      {hasEval && (
                        <Pill className={cn("text-[11px] font-[700] px-2 py-0.5 ml-auto", getScoreBadgeClass(fb.score as number))}>
                          {fb.score}%
                        </Pill>
                      )}
                    </div>
                    <p className={cn("text-[15px] font-[700] leading-[24px]", portalHeadingAlt)}>{q.question}</p>
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
                          <p className={cn("text-[13px] leading-[22px] whitespace-pre-wrap", portalHeadingAlt)}>{q.answerText}</p>
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
