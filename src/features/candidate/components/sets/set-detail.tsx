"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Clock, BarChart2, Users, Star, X,
  ChevronRight, Target, Zap, RotateCcw, Bookmark, Loader2, RefreshCw, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet, QuestionCategory } from "@/features/candidate/types/jobseeker";
import { DifficultyPill, CategoryPill, formatCategoryLabel } from "@/features/candidate/components/ui/pill";
import { CompanyInfoCard } from "./company-info-card";
import { findInProgressSession, abandonPracticeSession, getPracticeSession } from "@/features/candidate/services/practice-session.service";
import { toggleBookmark, getBookmarkedSetIds, getQuestionSetById, NotFoundError } from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import {
  portalDivider,
  portalHeadingAlt,
  portalIconWell,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { cleanTitle } from "@/features/candidate/utils/clean-title";

interface SetDetailProps {
  set: QuestionSet;
}

function CompanyModal({ name, logoUrl, onClose }: { name: string; logoUrl?: string | null; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors"
        >
          <X size={13} />
        </button>
        <CompanyInfoCard name={name} logoUrl={logoUrl} />
      </div>
    </div>
  );
}

export function SetDetail({ set }: SetDetailProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;
  const mp = t.jobseekerMarketplacePage;
  const { addToast } = useToast();
  const router = useRouter();

  const [inProgressSessionId, setInProgressSessionId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [startNewConfirmOpen, setStartNewConfirmOpen] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [unpublishedDialogOpen, setUnpublishedDialogOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

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

  /** Check publish status, show loading, then navigate — or show the unpublished dialog. */
  async function checkAndNavigate(destination: string) {
    if (navigating) return;
    setNavigating(true);
    try {
      await getQuestionSetById(set.id);
      router.push(destination);
    } catch (err) {
      setNavigating(false);
      if (err instanceof NotFoundError) {
        setUnpublishedDialogOpen(true);
      } else {
        addToast("error", p.loadFailed);
      }
    }
  }

  async function handleStartNew() {
    if (!inProgressSessionId || startingNew) return;
    setStartingNew(true);

    // Verify the set is still published before abandoning the in-progress session
    try {
      await getQuestionSetById(set.id);
    } catch (err) {
      setStartingNew(false);
      setStartNewConfirmOpen(false);
      if (err instanceof NotFoundError) {
        setUnpublishedDialogOpen(true);
      } else {
        addToast("error", p.loadFailed);
      }
      return;
    }

    abandonPracticeSession(inProgressSessionId)
      .then(() => {
        router.push(`/jobseeker/practice/${set.id}`);
      })
      .catch(async () => {
        // The old session may have already been auto-completed server-side (BE
        // enforces the set's time limit) by the time we tried to abandon it —
        // either way there's nothing IN_PROGRESS left, so starting fresh still works.
        const existing = await getPracticeSession(inProgressSessionId).catch(() => null);
        if (existing && existing.status !== "IN_PROGRESS") {
          router.push(`/jobseeker/practice/${set.id}`);
          return;
        }
        setStartingNew(false);
        setStartNewConfirmOpen(false);
        addToast("error", p.startNewFailed);
      });
  }

  // Categories are derived from whatever questionType values the real question set actually
  // contains (technical, behavioral, situational, problem-solving, system-design, ...) rather
  // than a fixed 3-value list, preserving first-seen order.
  const categories: QuestionCategory[] = Array.from(new Set(set.questions.map((q) => q.category)));

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
              {/* Company logo — React-state fallback to website logo.
                  logoError=true → falls back to /images/logo.png (website logo).
                  If even /images/logo.png is missing, shows a neutral initials div. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={logoError ? "fallback" : "primary"}
                src={(!logoError && set.companyLogoUrl?.trim()) ? set.companyLogoUrl! : "/images/logo.png"}
                alt={set.company ?? "logo"}
                onError={(e) => {
                  // First error: if company logo failed, switch to website logo
                  if (!logoError) {
                    setLogoError(true);
                    return;
                  }
                  // Second error: /images/logo.png itself is missing — hide img
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                className="w-12 h-12 rounded-xl object-contain shrink-0 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-1"
              />

              {/* Title + badge + company — takes remaining width */}
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <h1 className={cn("text-[20px] sm:text-[24px] font-extrabold leading-[1.3]", portalHeadingAlt)}>
                  {cleanTitle(set.title)}
                </h1>

                {/* Badge · company link */}
                <div className="flex items-center gap-2 flex-wrap">
                  <DifficultyPill difficulty={set.difficulty} label={set.difficulty} className="shrink-0 text-[12px] px-3 py-1.5" />
                  <p className={cn("text-[14px]", portalSubtextAlt)}>
                    {p.by}{" "}
                    <button
                      type="button"
                      onClick={() => setShowCompanyModal(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      {set.company}
                    </button>
                  </p>
                </div>
              </div>

              {/* Bookmark — top-right corner of the card header */}
              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={bookmarking}
                aria-label={bookmarked ? mp.unsaveBtn : mp.saveBtn}
                title={bookmarked ? mp.unsaveBtn : mp.saveBtn}
                className={cn(
                  "shrink-0 self-start w-9 h-9 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
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
              <p className={cn("text-[15px] leading-6 mb-5", portalSubtextAlt)}>{set.description}</p>
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
                <span className="flex items-center gap-1.5" title={p.ratingTooltip}>
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className={cn("font-semibold", portalHeadingAlt)}>{set.rating!.toFixed(1)}</span>
                  <span className={portalSubtextAlt}>/ 5</span>
                </span>
              )}
            </div>

          </div>

          {/* Question Preview */}
          <div className="hr-glass-card overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between">
              <h2 className={cn("text-[16px] font-bold", portalHeadingAlt)}>{p.preview}</h2>
              <span className={cn("text-[12px] font-medium", portalSubtextAlt)}>
                {set.totalQuestions} {p.questions}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {categories.map((cat) => {
                const qs = groupedQuestions[cat];
                if (qs.length === 0) return null;
                return (
                  <div key={cat} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <CategoryPill category={cat} label={formatCategoryLabel(cat)} />
                    <span className={cn("text-[12px] font-semibold tabular-nums", portalSubtextAlt)}>
                      {qs.length} {p.questions}
                    </span>
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
              <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{p.summaryCard.title}</p>
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
                  <span className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{value}</span>
                </div>
              ))}

              {/* Skill tags */}
              <div className={cn("pt-2 border-t", portalDivider)}>
                <div className="flex items-center justify-between mb-2">
                  <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalHeadingAlt)}>{p.skills}</p>
                  {set.skills.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSkills((v) => !v)}
                      className="text-[10px] font-semibold text-primary hover:underline"
                    >
                      {showAllSkills ? p.collapseSkills : p.showAllSkills.replace("{{count}}", String(set.skills.length))}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {(showAllSkills ? set.skills : set.skills.slice(0, 3)).map((s) => {
                    const skillIcon = getSkillIcon(s);
                    const SkillIcon = skillIcon?.icon;
                    return (
                      <span key={s} className={cn("text-[11px] font-medium px-2.5 py-1.5 rounded-md w-full flex items-center gap-2 truncate", portalMutedBg, portalHeadingAlt)}>
                        {SkillIcon && (
                          <SkillIcon size={13} className={cn("shrink-0", skillIcon.className)} />
                        )}
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* CTA — "Continue" if an in-progress session exists, else "Start".
                  Checks publish status before navigating; shows spinner while checking. */}
              <button
                type="button"
                disabled={navigating}
                onClick={() => void checkAndNavigate(`/jobseeker/practice/${set.id}`)}
                className="shimmer-button flex items-center justify-center gap-2 w-full h-10 text-[14px] font-semibold text-white hr-cta-btn rounded-lg mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {navigating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : inProgressSessionId ? (
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
              </button>

              {inProgressSessionId && (
                <button
                  type="button"
                  onClick={() => setStartNewConfirmOpen(true)}
                  disabled={startingNew}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full h-9 text-[13px] font-semibold rounded-lg border transition-colors disabled:opacity-60",
                    portalMutedBg, portalHeadingAlt,
                    "hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                  )}
                >
                  {startingNew ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {p.summaryCard.startNewBtn}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {showCompanyModal && set.company && (
        <CompanyModal
          name={set.company}
          logoUrl={set.companyLogoUrl}
          onClose={() => setShowCompanyModal(false)}
        />
      )}

      <ConfirmDialog
        open={startNewConfirmOpen}
        title={p.startNewConfirmTitle}
        message={p.startNewConfirmMessage}
        confirmLabel={p.startNewConfirmBtn}
        cancelLabel={p.startNewCancelBtn}
        variant="danger"
        loading={startingNew}
        onConfirm={() => void handleStartNew()}
        onCancel={() => setStartNewConfirmOpen(false)}
      />

      {/* ── "Recruiter hid this set" dialog ──────────────────────────────── */}
      {unpublishedDialogOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
              <EyeOff size={26} className="text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">
              {p.unpublishedDialogTitle}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {p.unpublishedDialogBody}
            </p>
            <button
              type="button"
              onClick={() => router.push("/jobseeker/practice")}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft size={14} />
              {p.unpublishedDialogBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
