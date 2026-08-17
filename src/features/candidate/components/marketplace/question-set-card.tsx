"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Clock, Users, Star, ChevronRight, BarChart2,
  Bookmark, Loader2, Pin, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { toggleBookmark } from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { cleanTitle } from "@/features/candidate/utils/clean-title";

const MAX_VISIBLE = 3;

// ---------------------------------------------------------------------------
// Skills popover
// ---------------------------------------------------------------------------

interface SkillsPopoverProps {
  skills: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function SkillsPopover({ skills, anchorRef, onClose }: SkillsPopoverProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position + reposition on scroll/resize — also flips upward if not enough room below
  useEffect(() => {
    function updatePos() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const POPUP_H = 300; // matches max-h-75 (75 × 4px = 300px)
      const above = window.innerHeight - r.bottom < POPUP_H + 8 && r.top > POPUP_H;
      const left = Math.min(r.left, window.innerWidth - 256 - 8); // keep inside viewport
      setPos({ top: above ? r.top - 6 : r.bottom + 6, left, above });
    }
    setMounted(true);
    updatePos();
    window.addEventListener("scroll", updatePos, { passive: true, capture: true });
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, { capture: true });
      window.removeEventListener("resize", updatePos);
    };
  }, [anchorRef]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchorRef, onClose]);

  if (!mounted || !pos) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        top: pos.top,
        left: pos.left,
        transform: pos.above ? "translateY(-100%)" : undefined,
      }}
      className="fixed z-9999 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 flex flex-col gap-1.5 w-64 max-h-75 overflow-y-auto animate-fade-up"
    >
      {skills.map((skill) => {
        const si = getSkillIcon(skill);
        const SIcon = si?.icon;
        return (
          <span
            key={skill}
            className="shrink-0 min-w-0 inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-[11px] font-medium px-2.5 py-1.5 rounded-md"
          >
            {SIcon && <SIcon size={11} className={cn("shrink-0", si.className)} />}
            <span className="truncate">{skill}</span>
          </span>
        );
      })}
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface QuestionSetCardProps {
  set: QuestionSet;
  initialBookmarked?: boolean;
  onBookmarkChange?: (id: string, bookmarked: boolean) => void;
}

export function QuestionSetCard({
  set,
  initialBookmarked = false,
  onBookmarkChange,
}: QuestionSetCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const { addToast } = useToast();
  const [logoError, setLogoError] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const skillsBtnRef = useRef<HTMLButtonElement>(null);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => setBookmarked(initialBookmarked), [initialBookmarked]);

  function handleToggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (bookmarking) return;
    setBookmarking(true);
    toggleBookmark(set.id)
      .then((next) => {
        setBookmarked(next);
        onBookmarkChange?.(set.id, next);
        addToast("success", next ? p.bookmarkSaved : p.bookmarkUnsaved);
      })
      .catch(() => addToast("error", p.bookmarkFailed))
      .finally(() => setBookmarking(false));
  }

  const visibleSkills = set.skills.slice(0, MAX_VISIBLE);
  const extraCount = set.skills.length - MAX_VISIBLE;

  // Difficulty top-strip colour
  const diffStrip =
    set.difficulty === "Easy"
      ? "bg-linear-to-r from-emerald-500 to-emerald-400"
      : set.difficulty === "Hard"
        ? "bg-linear-to-r from-rose-500 to-rose-400"
        : "bg-linear-to-r from-amber-500 to-amber-400";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden h-full",
        "border border-gray-200 dark:border-gray-700/70 bg-white dark:bg-gray-900",
        "shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/25",
        "transition-all duration-200"
      )}
    >
      {/* ── Difficulty colour strip ── */}
      <div className={cn("h-0.75 shrink-0", diffStrip)} />

      {/* ── Card body ── */}
      <div className="flex flex-col gap-3.5 p-5 flex-1">

        {/* Company logo + title + bookmark */}
        <div className="flex items-start gap-3">
          {/* Company avatar — React-state fallback to website logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(!logoError && set.companyLogoUrl?.trim()) ? set.companyLogoUrl! : "/images/logo.png"}
            alt={set.company}
            loading="lazy"
            decoding="async"
            onError={() => setLogoError(true)}
            className="w-11 h-11 rounded-xl object-contain shrink-0 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5 shadow-sm"
          />

          {/* Title + company */}
          <div className="flex-1 min-w-0">
            {/* Pinned / Trending badges */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
                {set.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    <Pin size={9} />
                    {p.badgePinned}
                  </span>
                )}
                {set.isTrending && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <TrendingUp size={9} />
                    {p.badgeTrending}
                  </span>
                )}
                {set.matchPercent != null && (
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {p.matchPercent.replace("{{n}}", String(set.matchPercent))}
                  </span>
                )}
                <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                  {set.myLastScore != null
                    ? p.lastScore.replace("{{n}}", String(Math.round(set.myLastScore)))
                    : p.notAttempted}
                </span>
              </div>
            <h3 className={cn("text-[14px] font-bold leading-snug line-clamp-2", portalHeadingAlt)}>
              {cleanTitle(set.title)}
            </h3>
            <p className={cn("text-[11px] mt-0.5 font-medium", portalSubtextAlt)}>{set.company}</p>
          </div>

          {/* Difficulty pill + bookmark stacked */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <DifficultyPill
              difficulty={set.difficulty}
              label={set.difficulty === "Easy" ? p.easy : set.difficulty === "Hard" ? p.hard : p.medium}
              size="sm"
            />
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={bookmarking}
              aria-label={bookmarked ? p.unsaveBtn : p.saveBtn}
              title={bookmarked ? p.unsaveBtn : p.saveBtn}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
                bookmarked
                  ? "bg-primary/10 dark:bg-primary/15 border-primary/30 text-primary hover:bg-primary/15"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-primary hover:border-primary/30"
              )}
            >
              {bookmarking ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Bookmark size={12} className={bookmarked ? "fill-primary" : ""} />
              )}
            </button>
          </div>
        </div>

        {/* Description */}
        <p className={cn("text-[12px] leading-relaxed line-clamp-2", portalSubtextAlt)}>
          {set.description}
        </p>

        {/* Skill tags */}
        {set.skills.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleSkills.map((skill) => {
              const si = getSkillIcon(skill);
              const SIcon = si?.icon;
              return (
                <span
                  key={skill}
                  className="min-w-0 max-w-28 inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-md"
                >
                  {SIcon && <SIcon size={10} className={cn("shrink-0", si.className)} />}
                  <span className="truncate">{skill}</span>
                </span>
              );
            })}
            {extraCount > 0 && (
              <button
                ref={skillsBtnRef}
                type="button"
                onClick={() => setShowSkills((v) => !v)}
                className="shrink-0 text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                +{extraCount}
              </button>
            )}
            {showSkills && (
              <SkillsPopover
                skills={set.skills}
                anchorRef={skillsBtnRef}
                onClose={() => setShowSkills(false)}
              />
            )}
          </div>
        )}

        {/* Rating */}
        {set.rating !== undefined && (
          <div className="flex items-center gap-1" title={p.ratingTooltip}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={11}
                className={
                  star <= Math.round(set.rating!)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"
                }
              />
            ))}
            <span className={cn("text-[12px] font-bold ml-1", portalHeadingAlt)}>
              {set.rating!.toFixed(1)}
            </span>
            <span className={cn("text-[11px]", portalSubtextAlt)}>/5</span>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <BarChart2 size={11} className="shrink-0" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{set.totalQuestions}</span>
          {" "}{p.questions}
        </span>
        <span className="mx-1.5 text-gray-200 dark:text-gray-700">·</span>
        <span className="flex items-center gap-1">
          <Clock size={11} className="shrink-0" />
          {set.avgCompletionMinutes
            ? (() => {
                const m = set.avgCompletionMinutes;
                if (m < 60) return `${p.avgMinutesPrefix}${m}${p.avgMinutesSuffix}`;
                const h = Math.floor(m / 60);
                const rem = m % 60;
                return rem === 0
                  ? `${p.avgMinutesPrefix}${h}${p.hoursUnit}`
                  : `${p.avgMinutesPrefix}${h}${p.hoursUnit} ${rem}${p.avgMinutesSuffix}`;
              })()
            : `${p.estimatedTime}${set.estimatedTime}`}
        </span>
        {set.attempts !== undefined && (
          <>
            <span className="mx-1.5 text-gray-200 dark:text-gray-700">·</span>
            <span className="flex items-center gap-1 ml-auto" title={p.attempts}>
              <Users size={11} className="shrink-0" />
              {set.attempts.toLocaleString()}
            </span>
          </>
        )}
      </div>

      {/* ── CTA footer ── */}
      <div className="px-5 pb-5 pt-3">
        <Link
          href={`/candidate/sets/${set.id}`}
          className="shimmer-button hr-cta-btn flex items-center justify-center gap-2 w-full h-10 rounded-xl text-[13px] font-semibold text-white group-hover:gap-3 transition-[gap] duration-150"
        >
          {p.startPractice}
          <ChevronRight size={15} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
