"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Share2, CheckCircle2,
  AlertCircle, Lightbulb, Sparkles, ChevronDown,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { skillRadarData } from "@/data/jobseeker";
import { useLanguage } from "@/context/language-context";
import type { PracticeSession } from "@/types/jobseeker";
import { Pill, getCategoryBadgeClass, getScoreLevel } from "@/components/jobseeker/ui/pill";
import { useChartTheme } from "@/hooks/use-chart-theme";
import {
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/lib/portal-ui";

function ScoreRing({ score, trackStroke }: { score: number; trackStroke: string }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 65 ? "#6C47FF" : "#F59E0B";

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
        <motion.span
          className={cn("text-[32px] font-[800] leading-none", portalHeadingAlt)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className={cn("text-[11px] font-[500]", portalSubtextAlt)}>/ 100</span>
      </div>
    </div>
  );
}

interface FeedbackPageProps {
  session: PracticeSession;
}

export function FeedbackPage({ session }: FeedbackPageProps) {
  const { t } = useLanguage();
  const p = t.jobseekerFeedbackPage;
  const chart = useChartTheme();

  const { label: scoreLevelLabel, badgeClass: scoreLevelBadgeClass } = getScoreLevel(session.score, p.scoreLevels);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(session.answers.length > 0 ? [session.answers[0].questionId] : [])
  );

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const aiInsight = session.score >= 80
    ? "Outstanding performance! Your answers showed depth, structure, and concrete examples. You're well-prepared for this interview level."
    : session.score >= 65
    ? "Solid performance. Your technical answers were strong, but behavioral responses could benefit from clearer STAR structure and specific metrics."
    : "Good start! Focus on providing more specific examples and quantifiable outcomes in your answers to significantly boost your score.";

  return (
    <div className="max-w-[900px] mx-auto">
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
        className="hr-glass-card p-8 mb-6 flex items-center gap-10"
      >
        <ScoreRing score={session.score} trackStroke={chart.isDark ? "#374151" : "#F3F4F6"} />

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className={cn("text-[24px] font-[800]", portalHeadingAlt)}>{p.overallScore}</h1>
            <span className={cn("text-[12px] font-[700] px-3 py-1 rounded-full", scoreLevelBadgeClass)}>
              {scoreLevelLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold", session.companyColor)}>
              {session.companyInitials}
            </div>
            <p className={cn("text-[14px]", portalSubtextAlt)}>{session.setTitle} · {session.company}</p>
          </div>

          {/* AI Insight */}
          <div className="hr-quick-generate rounded-lg p-4 flex gap-3">
            <Sparkles size={15} className="text-[#7C3AED] dark:text-[#a78bff] shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-[700] text-primary mb-1">{p.aiInsight}</p>
              <p className={cn("text-[13px] leading-[20px]", portalHeadingAlt)}>{aiInsight}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href={`/jobseeker/practice/${session.setId}`}
            className="shimmer-button flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg"
          >
            <RefreshCw size={13} />
            {p.retryBtn}
          </Link>
          <button className={cn(
            "hr-glass-card flex items-center gap-2 h-9 px-4 text-[13px] font-semibold hover:border-[#7C3AED]/30",
            portalHeadingAlt
          )}>
            <Share2 size={13} />
            {p.shareBtn}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-[1fr_320px] gap-6 mb-6">
        {/* ── Skill Breakdown ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hr-glass-card p-6"
        >
          <h2 className={cn("text-[16px] font-[700] mb-5", portalHeadingAlt)}>{p.skillBreakdown}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={skillRadarData}>
              <PolarGrid stroke={chart.gridStroke} />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 12, fontFamily: "Be Vietnam Pro", fill: chart.axisTickFill, fontWeight: 500 }}
              />
              <Radar
                dataKey="score"
                stroke="#6C47FF"
                fill="#6C47FF"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: "Be Vietnam Pro",
                  fontSize: 12,
                  borderRadius: 8,
                  backgroundColor: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  color: chart.isDark ? "#F3F4F6" : "#111827",
                }}
                formatter={(v) => [`${v} / 100`, "Score"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* ── Score breakdown bars ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="hr-glass-card p-6 flex flex-col gap-4"
        >
          <h2 className={cn("text-[16px] font-[700]", portalHeadingAlt)}>{p.skillBreakdown}</h2>
          {skillRadarData.map((item, i) => (
            <motion.div
              key={item.skill}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-[13px] font-[500]", portalHeadingAlt)}>{item.skill}</span>
                <span className={cn("text-[13px] font-[700]", portalHeadingAlt)}>{item.score}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    item.score >= 85 ? "bg-emerald-400" :
                    item.score >= 70 ? "bg-primary" : "bg-amber-400"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.06 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Question Reviews ─────────────────────────────────────── */}
      {session.answers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-4"
        >
          <h2 className={cn("text-[20px] font-[700]", portalHeadingAlt)}>{p.questionReviews}</h2>
          {session.answers.map((ans, i) => {
            const isExpanded = expandedIds.has(ans.questionId);
            return (
              <motion.div
                key={ans.questionId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="hr-glass-card p-6"
              >
                {/* Question header — always-visible summary, click to expand */}
                <button
                  onClick={() => toggleExpanded(ans.questionId)}
                  className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className={getCategoryBadgeClass(ans.category)}>{ans.category}</Pill>
                      <span className={cn("text-[12px]", portalSubtextAlt)}>Q{i + 1}</span>
                    </div>
                    <p className={cn("text-[15px] font-[700] leading-[24px]", portalHeadingAlt)}>{ans.questionText}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[22px] font-[800] leading-none",
                        ans.aiScore >= 80 ? "text-emerald-500" :
                        ans.aiScore >= 65 ? "text-primary" : "text-amber-500"
                      )}>
                        {ans.aiScore}
                      </span>
                      <span className={cn("text-[10px]", portalSubtextAlt)}>/ 100</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={cn("text-gray-400 dark:text-gray-500 transition-transform duration-200", isExpanded && "rotate-180")}
                    />
                  </div>
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
                      <div className="pt-5">
                        {/* Your answer */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-100 dark:border-gray-700/50">
                          <p className={cn("text-[11px] font-[700] uppercase tracking-wide mb-2", portalSubtextAlt)}>{p.yourAnswer}</p>
                          <p className={cn("text-[13px] leading-[22px]", portalHeadingAlt)}>{ans.answer}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Strengths */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              <p className="text-[12px] font-[700] text-emerald-700 dark:text-emerald-400">{p.strengths}</p>
                            </div>
                            <ul className="space-y-1">
                              {ans.strengths.map((s, j) => (
                                <li key={j} className={cn("flex items-start gap-2 text-[13px]", portalHeadingAlt)}>
                                  <span className="text-emerald-400 mt-1 shrink-0">·</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Improvements */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <AlertCircle size={13} className="text-amber-500" />
                              <p className="text-[12px] font-[700] text-amber-700 dark:text-amber-400">{p.improvements}</p>
                            </div>
                            <ul className="space-y-1">
                              {ans.improvements.map((s, j) => (
                                <li key={j} className={cn("flex items-start gap-2 text-[13px]", portalHeadingAlt)}>
                                  <span className="text-amber-400 mt-1 shrink-0">·</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* AI Suggestion */}
                        <div className="hr-quick-generate rounded-lg p-4 flex gap-3">
                          <Lightbulb size={14} className="text-[#7C3AED] dark:text-[#a78bff] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-[700] text-primary mb-1">{p.suggestion}</p>
                            <p className={cn("text-[13px] leading-[20px]", portalHeadingAlt)}>{ans.suggestion}</p>
                          </div>
                        </div>
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
