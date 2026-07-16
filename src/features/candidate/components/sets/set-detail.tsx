"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, BarChart2, Users, Star, ChevronDown,
  ChevronRight, Target, Zap, RotateCcw, Bookmark, Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet, QuestionCategory } from "@/features/candidate/types/jobseeker";
import { DifficultyPill, CategoryPill, formatCategoryLabel } from "@/features/candidate/components/ui/pill";
import { CompanyInfoCard } from "./company-info-card";
import { findInProgressSession } from "@/features/candidate/services/practice-session.service";
import { toggleBookmark, getBookmarkedSetIds } from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalDivider,
  portalHeadingAlt,
  portalIconWell,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

interface SetDetailProps {
  set: QuestionSet;
}

export function SetDetail({ set }: SetDetailProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;
  const mp = t.jobseekerMarketplacePage;
  const { addToast } = useToast();

  const [inProgressSessionId, setInProgressSessionId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    findInProgressSession(set.id)
      .then((found) => {
        if (!cancelled) setInProgressSessionId(found?.sessionId ?? null);
      })
      .catch(() => {
        // Non-critical — CTA just falls back to "Start"
      });
    getBookmarkedSetIds().then((ids) => {
      if (!cancelled) setBookmarked(ids.has(set.id));
    });
    return () => {
      cancelled = true;
    };
  }, [set.id]);

  function handleToggleBookmark() {
    if (bookmarking) return;
    setBookmarking(true);
    toggleBookmark(set.id)
      .then(setBookmarked)
      .catch(() => addToast("error", mp.bookmarkFailed))
      .finally(() => setBookmarking(false));
  }

  // Categories are derived from whatever questionType values the real question set actually
  // contains (technical, behavioral, situational, problem-solving, system-design, ...) rather
  // than a fixed 3-value list, preserving first-seen order.
  const categories: QuestionCategory[] = Array.from(new Set(set.questions.map((q) => q.category)));
  const [openCategory, setOpenCategory] = useState<QuestionCategory | null>(categories[0] ?? null);

  const groupedQuestions = categories.reduce((acc, cat) => {
    acc[cat] = set.questions.filter((q) => q.category === cat);
    return acc;
  }, {} as Record<QuestionCategory, typeof set.questions>);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/jobseeker"
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] font-[500] hover:text-primary transition-colors mb-6",
          portalSubtextAlt
        )}
      >
        <ArrowLeft size={14} />
        {p.backToSets}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        {/* ── Left content ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-6"
        >
          {/* Title block */}
          <div
            className="hr-glass-card p-6"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0", set.companyColor)}>
                {set.companyInitials}
              </div>
              <div className="flex-1">
                <h1 className={cn("text-[24px] font-[800] leading-[32px]", portalHeadingAlt)}>{set.title}</h1>
                <p className={cn("text-[14px] mt-1", portalSubtextAlt)}>{p.by} {set.company}</p>
              </div>
              <DifficultyPill difficulty={set.difficulty} label={set.difficulty} className="text-[12px] px-3 py-1.5" />
              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={bookmarking}
                aria-label={bookmarked ? mp.unsaveBtn : mp.saveBtn}
                title={bookmarked ? mp.unsaveBtn : mp.saveBtn}
                className={cn(
                  "shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
                  bookmarked
                    ? "bg-primary/10 dark:bg-primary/15 border-primary/30 text-primary hover:bg-primary/15"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary hover:border-primary/30"
                )}
              >
                {bookmarking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Bookmark size={16} className={bookmarked ? "fill-primary" : ""} />
                )}
              </button>
            </div>

            {set.description && (
              <p className={cn("text-[15px] leading-[24px] mb-5", portalSubtextAlt)}>{set.description}</p>
            )}

            {/* Meta pills */}
            <div className={cn("flex flex-wrap items-center gap-4 text-[13px]", portalSubtextAlt)}>
              <span className="flex items-center gap-1.5">
                <BarChart2 size={14} className="text-primary" />
                {set.totalQuestions} {p.questions}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-primary" />
                {set.estimatedTime}
              </span>
              {set.attempts !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-primary" />
                  {set.attempts.toLocaleString()} {p.summaryCard.attempts}
                </span>
              )}
              {set.rating !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className={cn("font-[600]", portalHeadingAlt)}>{set.rating}</span>
                </span>
              )}
            </div>

            {/* Skills */}
            <div className="mt-5">
              <p className={cn("text-[12px] font-[700] uppercase tracking-wide mb-3", portalHeadingAlt)}>{p.skills}</p>
              <div className="flex flex-wrap gap-2">
                {set.skills.map((s) => (
                  <span key={s} className={cn("text-[12px] font-[500] px-3 py-1.5 rounded-[6px]", portalMutedBg, portalHeadingAlt)}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Company info block */}
          {set.company && (
            <CompanyInfoCard name={set.company} logoUrl={set.companyLogoUrl} />
          )}

          {/* Question Preview */}
          <div
            className="hr-glass-card overflow-hidden"
          >
            <div className={cn("px-6 py-4 border-b", portalDivider)}>
              <h2 className={cn("text-[16px] font-[700]", portalHeadingAlt)}>{p.preview}</h2>
            </div>

            <div className={cn("divide-y", portalDivider)}>
              {categories.map((cat) => {
                const qs = groupedQuestions[cat];
                if (qs.length === 0) return null;
                const isOpen = openCategory === cat;

                return (
                  <div key={cat}>
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : cat)}
                      className="hr-table-row w-full flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryPill category={cat} label={formatCategoryLabel(cat)} />
                        <span className={cn("text-[13px]", portalSubtextAlt)}>{qs.length} questions</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={cn("text-gray-400 dark:text-gray-500 transition-transform duration-200", isOpen && "rotate-180")}
                      />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {qs.map((q, idx) => (
                            <li
                              key={q.id}
                              className={cn(
                                "flex items-start gap-4 px-6 py-4 border-t",
                                portalDivider,
                                portalIconWell
                              )}
                            >
                              <span className={cn("text-[12px] font-[600] w-5 shrink-0 pt-0.5", portalSubtextAlt)}>
                                {idx + 1}.
                              </span>
                              <p className={cn("text-[14px] leading-[22px] flex-1", portalHeadingAlt)}>{q.text}</p>
                              <DifficultyPill difficulty={q.difficulty} label={q.difficulty} size="sm" />
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Right sticky summary card ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:sticky lg:top-6"
        >
          <div
            className="hr-glass-card overflow-hidden"
          >
            {/* Card header */}
            <div className={cn("px-5 py-4 border-b", portalIconWell, portalDivider)}>
              <p className={cn("text-[14px] font-[700]", portalHeadingAlt)}>{p.summaryCard.title}</p>
            </div>

            {/* Stats */}
            <div className="p-5 flex flex-col gap-4">
              {[
                { label: p.summaryCard.totalQuestions, value: `${set.totalQuestions}`, icon: BarChart2 },
                { label: p.summaryCard.estimatedTime, value: set.estimatedTime, icon: Clock },
                { label: p.summaryCard.difficulty, value: set.difficulty, icon: Zap },
                { label: p.summaryCard.targetScore, value: "≥ 75 / 100", icon: Target },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className={cn("flex items-center gap-2 text-[13px]", portalSubtextAlt)}>
                    <Icon size={14} className="text-primary" />
                    {label}
                  </div>
                  <span className={cn("text-[13px] font-[600]", portalHeadingAlt)}>{value}</span>
                </div>
              ))}

              {/* Skill tags */}
              <div className={cn("pt-2 border-t", portalDivider)}>
                <p className={cn("text-[11px] font-[700] uppercase tracking-wide mb-2", portalHeadingAlt)}>{p.skills}</p>
                <div className="flex flex-wrap gap-1.5">
                  {set.skills.map((s) => (
                    <span key={s} className={cn("text-[11px] font-[500] px-2 py-1 rounded-[4px]", portalMutedBg, portalHeadingAlt)}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA — "Continue" if an in-progress session exists, else "Start" */}
              <Link
                href={`/jobseeker/practice/${set.id}`}
                className="shimmer-button flex items-center justify-center gap-2 w-full h-10 text-[14px] font-semibold text-white hr-cta-btn rounded-lg mt-2"
              >
                {inProgressSessionId ? (
                  <>
                    <RotateCcw size={14} />
                    {p.summaryCard.continueBtn}
                  </>
                ) : (
                  <>
                    {p.summaryCard.startBtn}
                    <ChevronRight size={14} />
                  </>
                )}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
