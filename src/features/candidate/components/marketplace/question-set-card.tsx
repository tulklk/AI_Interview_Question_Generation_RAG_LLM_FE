"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Clock, Users, Star, ChevronRight, BarChart2,
  Bookmark, Loader2, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { toggleBookmark } from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { cleanTitle } from "@/features/candidate/utils/clean-title";

// ── Constants ────────────────────────────────────────────────────────────────
const SKILLS_SHOWN = 4;

// ── Difficulty color tokens ───────────────────────────────────────────────────

/** Left 4px accent strip — solid color, no rounded conflict (overflow-hidden handles it) */
const DIFF_ACCENT_BG: Record<QuestionSet["difficulty"], string> = {
  Easy:   "bg-emerald-400 dark:bg-emerald-500",
  Medium: "bg-amber-400 dark:bg-amber-500",
  Hard:   "bg-rose-500 dark:bg-rose-500",
};

/** Very subtle tinted surface per difficulty */
const DIFF_CARD_BG: Record<QuestionSet["difficulty"], string> = {
  Easy:   "bg-linear-to-r from-emerald-50/50 to-gray-50/80 dark:from-emerald-950/15 dark:to-gray-900/90",
  Medium: "bg-linear-to-r from-amber-50/50 to-gray-50/80 dark:from-amber-950/15 dark:to-gray-900/90",
  Hard:   "bg-linear-to-r from-rose-50/50 to-gray-50/80 dark:from-rose-950/15 dark:to-gray-900/90",
};

/** Colored glow on hover, matched to difficulty */
const DIFF_GLOW: Record<QuestionSet["difficulty"], string> = {
  Easy:   "hover:shadow-[0_6px_24px_rgba(16,185,129,0.16),0_2px_8px_rgba(0,0,0,0.05)]",
  Medium: "hover:shadow-[0_6px_24px_rgba(245,158,11,0.16),0_2px_8px_rgba(0,0,0,0.05)]",
  Hard:   "hover:shadow-[0_6px_24px_rgba(239,68,68,0.16),0_2px_8px_rgba(0,0,0,0.05)]",
};

// ── Star rating display ───────────────────────────────────────────────────────
// Shows 5 star icons filled/half/empty based on the rating value.
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const threshold = i + 1;
        const full = rating >= threshold;
        const half = !full && rating >= threshold - 0.5;
        return (
          <Star
            key={i}
            size={14}
            className={cn(
              full ? "text-amber-400 fill-amber-400"
                   : half ? "text-amber-400 fill-amber-400"
                   : "text-gray-300 dark:text-gray-600",
            )}
            style={half ? { opacity: 0.45 } : undefined}
          />
        );
      })}
      <span className="ml-0.5 text-[12px] font-semibold text-gray-600 dark:text-gray-300 tabular-nums leading-none">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// ── Duration helper ──────────────────────────────────────────────────────────
// Parse a raw estimatedTime string from the backend ("~45 min", "~1h 30m",
// "90", "-15 min", …) into total minutes so we can reformat it with the
// correct localized suffix.  Returns null if the string cannot be parsed.
function parseEstimatedMinutes(raw: string): number | null {
  // Strip any leading non-digit modifier (~ ≈ - +)
  const s = raw.trim().replace(/^[~≈\-+]/, "").trim();
  // "1h 30m", "1h30", "1 hour 30 min", "1 giờ 30 phút"
  const hm = s.match(/^(\d+)\s*(?:h(?:ours?)?|giờ)\s*(?:(\d+)\s*(?:m(?:in(?:utes?)?)?|phút)?)?/i);
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  // "45 min", "45 phút", "45m", "45"
  const m = s.match(/^(\d+)(?:\s*(?:m(?:in(?:utes?)?)?|phút))?$/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function fmtDuration(
  set: QuestionSet,
  l: { avgMinutesSuffix: string; estimatedTime: string; hoursUnit: string },
): string | null {
  // Prefer the HR-configured estimated time — it's the intended duration of the
  // set. avgCompletionMinutes is the mean of all user sessions and can be wildly
  // off (e.g. 3 599 min when a user left a tab open), so only use it as a fallback
  // when no estimatedTime has been set by the HR.
  if (set.estimatedTime?.trim()) {
    const mins = parseEstimatedMinutes(set.estimatedTime);
    if (mins !== null && mins > 0) {
      // Reformat with localized units so it respects the active language.
      if (mins < 60) return `${l.estimatedTime}${mins}${l.avgMinutesSuffix}`;
      const h = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem === 0
        ? `${l.estimatedTime}${h}${l.hoursUnit}`
        : `${l.estimatedTime}${h}${l.hoursUnit} ${rem}${l.avgMinutesSuffix}`;
    }
    // Not parseable (free-text note from HR) → show raw as-is.
    return set.estimatedTime.trim();
  }
  if (set.avgCompletionMinutes) {
    const m = set.avgCompletionMinutes;
    if (m < 60) return `${m}${l.avgMinutesSuffix}`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0
      ? `${h}${l.hoursUnit}`
      : `${h}${l.hoursUnit} ${rem}${l.avgMinutesSuffix}`;
  }
  return null;
}

// ── Skills popover portal ─────────────────────────────────────────────────────
function SkillsPopover({
  skills,
  anchorRef,
  onClose,
}: {
  skills: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const above = window.innerHeight - r.bottom < 260 && r.top > 260;
      setPos({
        top: above ? r.top - 6 : r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - 244 - 8),
        above,
      });
    }
    measure();
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [anchorRef]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (
        ref.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: pos.above ? "translateY(-100%)" : undefined,
        zIndex: 9999,
      }}
      className="w-60 max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 flex flex-col gap-1.5"
    >
      {skills.map((skill) => {
        const si = getSkillIcon(skill);
        const SIcon = si?.icon;
        return (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
          >
            {SIcon && <SIcon size={11} className={cn("shrink-0", si.className)} />}
            <span className="truncate">{skill}</span>
          </span>
        );
      })}
    </div>,
    document.body,
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface QuestionSetCardProps {
  set: QuestionSet;
  initialBookmarked?: boolean;
  onBookmarkChange?: (id: string, bookmarked: boolean) => void;
  /** When true, renders the CV-match badge + bar at a larger size (vertical layout only). */
  featured?: boolean;
  /**
   * "vertical"  — stacked card for grid view (default, used in dashboard).
   * "horizontal" — row layout for list view (used in marketplace).
   */
  layout?: "vertical" | "horizontal";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function QuestionSetCard({
  set,
  initialBookmarked = false,
  onBookmarkChange,
  featured = false,
  layout = "vertical",
}: QuestionSetCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const { addToast } = useToast();

  const [logoError, setLogoError] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const skillsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setBookmarked(initialBookmarked), [initialBookmarked]);

  function handleBookmark(e: React.MouseEvent) {
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

  const diff = set.difficulty;
  const dur = fmtDuration(set, {
    avgMinutesSuffix: p.avgMinutesSuffix,
    estimatedTime: p.estimatedTime,
    hoursUnit: p.hoursUnit,
  });
  const visSkills = set.skills.slice(0, SKILLS_SHOWN);
  const extraSkills = set.skills.length - SKILLS_SHOWN;
  const hasMatch = set.matchPercent != null;

  // ── Shared pieces ────────────────────────────────────────────────────────────

  const logoImg = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={(!logoError && set.companyLogoUrl?.trim()) ? set.companyLogoUrl! : "/images/logo.png"}
      alt={set.company}
      loading="lazy"
      decoding="async"
      onError={() => setLogoError(true)}
      className="w-full h-full object-contain p-0.5"
    />
  );

  const pillsRow = (
    <div className="flex flex-wrap items-center gap-1.5">
      <DifficultyPill
        difficulty={diff}
        label={diff === "Easy" ? p.easy : diff === "Hard" ? p.hard : p.medium}
        size="sm"
      />
      {set.myLastScore != null ? (
        <span className={cn(
          "inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full border",
          "bg-violet-50 text-violet-700 border-violet-200/80",
          "dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700/40",
        )}>
          {p.lastScore.replace("{{n}}", String(Math.round(set.myLastScore)))}
        </span>
      ) : (
        <span className={cn(
          "inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full border",
          "bg-gray-100/80 text-gray-500 border-gray-200/80",
          "dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700/60",
        )}>
          {p.notAttempted}
        </span>
      )}
      {set.isTrending && (
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
          "bg-emerald-100 text-emerald-700 border-emerald-200/70",
          "dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/40",
        )}>
          <TrendingUp size={9} />
          {p.badgeTrending}
        </span>
      )}
    </div>
  );

  const skillsRow = set.skills.length > 0 ? (
    <div className="flex flex-wrap items-center gap-1.5">
      {visSkills.map((skill) => {
        const si = getSkillIcon(skill);
        const SIcon = si?.icon;
        return (
          <span
            key={skill}
            className={cn(
              "inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-md max-w-28",
              "bg-white/70 dark:bg-gray-800/80",
              "border border-gray-200/80 dark:border-gray-700/60",
              "text-gray-600 dark:text-gray-300",
            )}
          >
            {SIcon && <SIcon size={10} className={cn("shrink-0", si.className)} />}
            <span className="truncate">{skill}</span>
          </span>
        );
      })}
      {extraSkills > 0 && (
        <button
          ref={skillsBtnRef}
          type="button"
          onClick={() => setShowSkills((v) => !v)}
          className={cn(
            "text-[10.5px] font-semibold px-2 py-0.5 rounded-md border transition-colors",
            "bg-primary/10 dark:bg-primary/15 border-primary/20 text-primary",
            "hover:bg-primary/15 dark:hover:bg-primary/20",
          )}
        >
          +{extraSkills}
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
  ) : null;

  const statsRow = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
        <BarChart2 size={10} className="text-primary/60 shrink-0" />
        {set.totalQuestions} {p.questions}
      </span>
      {dur && (
        <>
          <span className="text-gray-200 dark:text-gray-700 select-none">·</span>
          <span className="flex items-center gap-1">
            <Clock size={10} className="text-primary/60 shrink-0" />
            {dur}
          </span>
        </>
      )}
      {set.attempts !== undefined && (
        <>
          <span className="text-gray-200 dark:text-gray-700 select-none">·</span>
          <span className="flex items-center gap-1">
            <Users size={10} className="text-primary/60 shrink-0" />
            <span className="tabular-nums">{set.attempts.toLocaleString()}</span>
          </span>
        </>
      )}
    </div>
  );

  const matchBar = hasMatch ? (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-violet-400 relative overflow-hidden"
          style={{ width: `${Math.min(100, set.matchPercent!)}%` }}
        >
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.45) 50%,transparent 100%)",
              animation: "qs-bar-shimmer 2s linear infinite",
            }}
          />
        </div>
      </div>
      <span className="text-[11px] font-bold text-primary whitespace-nowrap shrink-0">
        {set.matchPercent}% Khớp CV
      </span>
    </div>
  ) : null;

  const bookmarkBtn = (
    <button
      type="button"
      onClick={handleBookmark}
      disabled={bookmarking}
      aria-label={bookmarked ? p.unsaveBtn : p.saveBtn}
      title={bookmarked ? p.unsaveBtn : p.saveBtn}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-150",
        bookmarked
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-white/70 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5",
      )}
    >
      {bookmarking
        ? <Loader2 size={12} className="animate-spin" />
        : <Bookmark size={12} className={bookmarked ? "fill-primary" : ""} />}
    </button>
  );

  const style_block = (
    <style>{`
      @keyframes qs-bar-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
      @keyframes qs-cta-grad{0%,100%{background-position:0% center}50%{background-position:100% center}}
      @keyframes qs-cta-sweep{0%{transform:translateX(-100%) skewX(-12deg)}100%{transform:translateX(300%) skewX(-12deg)}}
    `}</style>
  );

  // ── Horizontal layout (marketplace list view) ────────────────────────────────
  if (layout === "horizontal") {
    return (
      <>
        {style_block}
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border flex flex-row",
            "border-gray-100/80 dark:border-gray-800/70",
            DIFF_CARD_BG[diff],
            "shadow-[0_1px_4px_rgba(0,0,0,0.05)]",
            "hover:-translate-y-0.5 hover:border-primary/30",
            DIFF_GLOW[diff],
            "transition-all duration-200 ease-out",
          )}
        >
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

          {/* Left accent strip (4px vertical) */}
          <div className={cn("w-1 shrink-0 self-stretch", DIFF_ACCENT_BG[diff])} />

          {/* Content row */}
          <div className="relative z-10 flex flex-row flex-1 min-w-0 gap-4 px-4 py-4">

            {/* Logo — aligned to top */}
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/80 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm shrink-0 self-start mt-0.5">
              {logoImg}
            </div>

            {/* Middle: meta */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              {pillsRow}
              <h3 className="text-[15px] font-bold leading-snug line-clamp-1 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-150">
                {cleanTitle(set.title)}
              </h3>
              <p className="text-[12px] font-semibold text-gray-400 dark:text-gray-500">
                {set.company}
              </p>
              {skillsRow}
              {statsRow}
            </div>

            {/* Right column: bookmark → spacer → match badge + bar → CTA */}
            <div className="hidden sm:flex flex-col items-end gap-2.5 shrink-0 w-44">

              {/* Top: bookmark (+ stars if rated) */}
              <div className="flex items-center gap-2 self-end">
                {set.rating !== undefined && <StarDisplay rating={set.rating} />}
                {bookmarkBtn}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Match% badge + bar */}
              {hasMatch && (
                <div className="w-full flex flex-col items-end gap-1.5">
                  <span className={cn(
                    "inline-flex items-center text-[12px] font-bold px-3 py-1 rounded-full",
                    "bg-violet-50 dark:bg-violet-950/50",
                    "text-violet-600 dark:text-violet-300",
                    "border border-violet-200/70 dark:border-violet-700/40",
                  )}>
                    {set.matchPercent}% Khớp CV
                  </span>
                  <div className="w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-primary to-violet-400 relative overflow-hidden"
                      style={{ width: `${Math.min(100, set.matchPercent!)}%` }}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.45) 50%,transparent 100%)",
                          animation: "qs-bar-shimmer 2s linear infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CTA button — full width of right column */}
              <Link
                href={`/candidate/sets/${set.id}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "relative w-full h-9 flex items-center justify-center gap-1.5 overflow-hidden",
                  "rounded-lg font-semibold text-white text-[12.5px]",
                  "group-hover:gap-2 transition-[gap] duration-150",
                  !featured && "bg-primary hover:bg-primary/90 transition-colors duration-150",
                )}
                style={featured ? {
                  background: "linear-gradient(90deg,#7c3aed,#a855f7 40%,#06b6d4)",
                  backgroundSize: "200% auto",
                  animation: "qs-cta-grad 4s ease-in-out infinite",
                } : undefined}
              >
                {featured && (
                  <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%)",
                      animation: "qs-cta-sweep 3s ease-in-out infinite",
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {p.startPractice}
                  <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>

            {/* Mobile right: bookmark + icon CTA */}
            <div className="flex sm:hidden flex-col items-end justify-between gap-2 shrink-0">
              {bookmarkBtn}
              <Link
                href={`/candidate/sets/${set.id}`}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Vertical layout (dashboard grid — default) ───────────────────────────────
  return (
    <>
    {style_block}
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border flex flex-col h-full",
        "border-gray-100/80 dark:border-gray-800/70",
        DIFF_CARD_BG[diff],
        "shadow-[0_1px_4px_rgba(0,0,0,0.05)]",
        "hover:-translate-y-0.5 hover:border-primary/30",
        DIFF_GLOW[diff],
        "transition-all duration-200 ease-out",
      )}
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* Top accent strip */}
      <div className={cn("h-1 w-full shrink-0", DIFF_ACCENT_BG[diff])} />

      {/* Card body */}
      <div className="relative z-10 flex flex-col flex-1 p-4 gap-3">

        {/* Row 1: Logo + bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/80 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm shrink-0">
            {logoImg}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {set.rating !== undefined && <StarDisplay rating={set.rating} />}
            {bookmarkBtn}
          </div>
        </div>

        {/* Row 2: Difficulty + status pills */}
        {pillsRow}

        {/* Row 3: Title */}
        <h3 className="text-[14px] font-bold leading-snug line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-150">
          {cleanTitle(set.title)}
        </h3>

        {/* Row 4: Company */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 -mt-1">
          {set.company}
        </p>

        {/* Row 5: Skills chips */}
        {skillsRow}

        {/* Row 6: Stats */}
        {statsRow}

        {/* Spacer — pushes match% + CTA to bottom */}
        <div className="flex-1" />

        {/* Row 7: CV match bar */}
        {matchBar}

        {/* Row 8: CTA */}
        <Link
          href={`/candidate/sets/${set.id}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative w-full flex items-center justify-center gap-1.5 overflow-hidden",
            "font-semibold text-white rounded-lg",
            featured
              ? "h-9 text-[13px]"
              : "h-9 text-[12.5px] bg-primary hover:bg-primary/90 transition-colors duration-150",
            "group-hover:gap-2 transition-[gap] duration-150",
          )}
          style={featured ? {
            background: "linear-gradient(90deg,#7c3aed,#a855f7 40%,#06b6d4)",
            backgroundSize: "200% auto",
            animation: "qs-cta-grad 4s ease-in-out infinite",
          } : undefined}
        >
          {featured && (
            <span
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%)",
                animation: "qs-cta-sweep 3s ease-in-out infinite",
              }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {p.startPractice}
            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
    </>
  );
}
