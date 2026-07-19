"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Clock, Users, Star, ChevronRight, BarChart2, Bookmark, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { toggleBookmark } from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";

const MAX_VISIBLE = 3;

const skillTag = "shrink-0 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/30 text-[11px] font-medium px-2.5 py-1 rounded-md";

interface SkillsPopoverProps {
  skills: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function SkillsPopover({ skills, anchorRef, onClose }: SkillsPopoverProps) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
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

  if (!mounted || !rect) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: rect.bottom + 6, left: rect.left }}
      className="fixed z-9999 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 flex flex-wrap gap-1.5 max-w-55 animate-fade-up"
    >
      {skills.map((skill) => (
        <span key={skill} className={skillTag}>{skill}</span>
      ))}
    </div>,
    document.body
  );
}

interface QuestionSetCardProps {
  set: QuestionSet;
  initialBookmarked?: boolean;
  onBookmarkChange?: (id: string, bookmarked: boolean) => void;
}

export function QuestionSetCard({ set, initialBookmarked = false, onBookmarkChange }: QuestionSetCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const { addToast } = useToast();
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
      })
      .catch(() => addToast("error", p.bookmarkFailed))
      .finally(() => setBookmarking(false));
  }

  const visibleSkills = set.skills.slice(0, MAX_VISIBLE);
  const extraCount = set.skills.length - MAX_VISIBLE;

  return (
    <div className="hr-glass-card group flex flex-col gap-0 overflow-hidden h-full">
      {/* Card body */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {set.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={set.companyLogoUrl}
              alt={set.company}
              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700"
            />
          ) : (
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0",
                set.companyColor
              )}
            >
              {set.companyInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-[14px] font-[700] leading-[20px] line-clamp-2", portalHeadingAlt)}>
              {set.title}
            </h3>
            <p className={cn("text-[12px] mt-0.5", portalSubtextAlt)}>{set.company}</p>
          </div>
          <DifficultyPill difficulty={set.difficulty} label={set.difficulty} />
          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarking}
            aria-label={bookmarked ? p.unsaveBtn : p.saveBtn}
            title={bookmarked ? p.unsaveBtn : p.saveBtn}
            className={cn(
              "shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
              bookmarked
                ? "bg-primary/10 dark:bg-primary/15 border-primary/30 text-primary hover:bg-primary/15"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary hover:border-primary/30"
            )}
          >
            {bookmarking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bookmark size={14} className={bookmarked ? "fill-primary" : ""} />
            )}
          </button>
        </div>

        {/* Description */}
        <p className={cn("text-[13px] leading-[20px] line-clamp-2", portalSubtextAlt)}>
          {set.description}
        </p>

        {/* Skills — single row, overflow shows +N chip */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          {visibleSkills.map((skill) => (
            <span key={skill} className={skillTag}>{skill}</span>
          ))}
          {extraCount > 0 && (
            <button
              ref={skillsBtnRef}
              type="button"
              onClick={() => setShowSkills((v) => !v)}
              className="shrink-0 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
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

        {/* Meta row */}
        <div className={cn("flex items-center gap-4 text-[12px]", portalSubtextAlt)}>
          <span className="flex items-center gap-1">
            <BarChart2 size={12} className="shrink-0" />
            {set.totalQuestions} {p.questions}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="shrink-0" />
            {p.estimatedTime}{set.estimatedTime}
          </span>
          {set.attempts !== undefined && (
            <span className="flex items-center gap-1 ml-auto">
              <Users size={12} className="shrink-0" />
              {set.attempts.toLocaleString()}
            </span>
          )}
        </div>

        {/* Rating */}
        {set.rating !== undefined && (
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={
                  star <= Math.round(set.rating!)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"
                }
              />
            ))}
            <span className={cn("text-[12px] font-[600] ml-1", portalHeadingAlt)}>{set.rating!.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-6 pb-5">
        <Link
          href={`/jobseeker/sets/${set.id}`}
          className="shimmer-button flex items-center justify-center gap-2 w-full text-[14px] font-semibold text-white hr-cta-btn rounded-lg h-9"
        >
          {p.startPractice}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
