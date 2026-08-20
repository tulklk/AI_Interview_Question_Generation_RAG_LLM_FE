"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bookmark, Loader2, Star, TrendingUp, ChevronRight, BarChart2, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { toggleBookmark } from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { cleanTitle } from "@/features/candidate/utils/clean-title";

const HERO_SKILLS_MAX = 5;

// ── Reduced-motion hook ──────────────────────────────────────────────────────
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const cb = () => setReduced(mq.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return reduced;
}

// ── Animated score counter (0 → N, ~700ms, easeOut) ─────────────────────────
function AnimatedScore({ value, active }: { value: number; active: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const reduced = useReducedMotion();
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    if (reduced) { setDisplayed(value); return; }
    const start = Date.now();
    const dur = 700;
    function tick() {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // cubic easeOut
      setDisplayed(Math.round(eased * value));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, active, reduced]);

  return <>{displayed}</>;
}

// ── Duration helper ──────────────────────────────────────────────────────────
function formatDuration(set: QuestionSet, prefixes: { avg: string; avgSuffix: string; est: string; h: string }): string | null {
  if (set.avgCompletionMinutes) {
    const m = set.avgCompletionMinutes;
    if (m < 60) return `${prefixes.avg}${m}${prefixes.avgSuffix}`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0
      ? `${prefixes.avg}${h}${prefixes.h}`
      : `${prefixes.avg}${h}${prefixes.h} ${rem}${prefixes.avgSuffix}`;
  }
  if (set.estimatedTime?.trim()) return `${prefixes.est}${set.estimatedTime}`;
  return null;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface FeaturedHeroCardProps {
  set: QuestionSet;
  isBookmarked: boolean;
  onBookmarkChange: (id: string, bookmarked: boolean) => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function FeaturedHeroCard({ set, isBookmarked, onBookmarkChange }: FeaturedHeroCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const { addToast } = useToast();

  const [logoError, setLogoError] = useState(false);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [inView, setInView] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => setBookmarked(isBookmarked), [isBookmarked]);

  // Trigger score animation when card enters viewport
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (bookmarking) return;
    setBookmarking(true);
    toggleBookmark(set.id)
      .then((next) => {
        setBookmarked(next);
        onBookmarkChange(set.id, next);
        addToast("success", next ? p.bookmarkSaved : p.bookmarkUnsaved);
      })
      .catch(() => addToast("error", p.bookmarkFailed))
      .finally(() => setBookmarking(false));
  }

  const visSkills = set.skills.slice(0, HERO_SKILLS_MAX);
  const extraSkills = set.skills.length - HERO_SKILLS_MAX;
  const duration = formatDuration(set, {
    avg: p.avgMinutesPrefix,
    avgSuffix: p.avgMinutesSuffix,
    est: p.estimatedTime,
    h: p.hoursUnit,
  });
  const hasMatch = set.matchPercent != null;

  return (
    <motion.section
      ref={heroRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      aria-label={cleanTitle(set.title)}
      className="mb-8"
    >
      {/* ── Section label ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-bold text-primary flex items-center gap-1.5">
          <span aria-hidden>✦</span>
          {p.featuredLabel}
        </span>
      </div>

      {/* ── Hero card ── */}
      <div className={cn(
        "group relative overflow-hidden rounded-2xl border",
        // Light mode surface
        "bg-linear-to-br from-violet-50 via-white to-indigo-50/40",
        "border-violet-200/60",
        // Dark mode surface
        "dark:bg-linear-to-br dark:from-[#1e1333] dark:via-[#111827] dark:to-[#0f172a]",
        "dark:border-violet-500/20",
        // Shadow
        "shadow-[0_4px_24px_rgba(109,40,217,0.08)]",
        "dark:shadow-[0_4px_40px_rgba(109,40,217,0.22)]",
        "hover:shadow-[0_8px_40px_rgba(109,40,217,0.14)] dark:hover:shadow-[0_8px_48px_rgba(109,40,217,0.32)]",
        "transition-shadow duration-250 ease-out"
      )}>
        {/* Atmospheric glow (dark) */}
        <div className="absolute inset-0 pointer-events-none dark:block hidden">
          <div
            className="absolute -top-16 -left-16 w-[480px] h-[320px] opacity-15 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(139,92,246,1), transparent 65%)" }}
          />
          <div
            className="absolute -bottom-8 right-0 w-64 h-64 opacity-8 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(6,182,212,1), transparent 70%)" }}
          />
        </div>

        {/* Top border accent (purple→cyan) */}
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-violet-400/0 via-violet-500/70 to-cyan-400/40 dark:via-violet-400/60 dark:to-cyan-400/40" />

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row gap-6 p-6 sm:p-8">

          {/* ── LEFT: company + title + skills + stats ── */}
          <div className="flex-1 min-w-0 flex gap-5 items-start">
            {/* Company logo */}
            <div className="shrink-0 mt-0.5">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-violet-100/80 dark:border-violet-700/30 bg-white dark:bg-gray-800 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(!logoError && set.companyLogoUrl?.trim()) ? set.companyLogoUrl! : "/images/logo.png"}
                  alt={set.company}
                  loading="eager"
                  decoding="async"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain p-1"
                />
              </div>
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <DifficultyPill
                  difficulty={set.difficulty}
                  label={set.difficulty === "Easy" ? p.easy : set.difficulty === "Hard" ? p.hard : p.medium}
                  size="sm"
                />
                {set.isTrending && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    "bg-emerald-100 text-emerald-700 border border-emerald-200/70",
                    "dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40"
                  )}>
                    <TrendingUp size={9} />{p.badgeTrending}
                  </span>
                )}
              </div>

              <h2 className="text-[19px] sm:text-[22px] font-extrabold leading-tight text-gray-900 dark:text-white mb-1 line-clamp-2">
                {cleanTitle(set.title)}
              </h2>
              <p className="text-[12.5px] font-semibold text-gray-500 dark:text-gray-400 mb-4">
                {set.company}
              </p>

              {/* Skills */}
              {set.skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {visSkills.map((skill) => {
                    const si = getSkillIcon(skill);
                    const SIcon = si?.icon;
                    return (
                      <span
                        key={skill}
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md",
                          "bg-white/80 border border-violet-100 text-gray-700",
                          "dark:bg-white/5 dark:border-violet-800/30 dark:text-gray-300"
                        )}
                      >
                        {SIcon && <SIcon size={11} className={cn("shrink-0", si.className)} />}
                        {skill}
                      </span>
                    );
                  })}
                  {extraSkills > 0 && (
                    <span className="text-[11px] font-semibold text-primary/70 dark:text-violet-400">
                      +{extraSkills}
                    </span>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                  <BarChart2 size={12} className="inline mr-1 text-primary/60" />
                  {set.totalQuestions} {p.questions}
                </span>

                {duration && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-primary/60 shrink-0" />
                      {duration}
                    </span>
                  </>
                )}

                {set.rating !== undefined && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{set.rating.toFixed(1)}</span>
                    </span>
                  </>
                )}

                {set.attempts !== undefined && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                    <span className="flex items-center gap-1">
                      <Users size={12} className="text-primary/60 shrink-0" />
                      <span className="tabular-nums">{set.attempts.toLocaleString()}</span>
                      <span>{p.attempts}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Previous score (secondary — lower visual weight) */}
              {set.myLastScore != null && (
                <p className="mt-2.5 text-[12px] text-gray-400 dark:text-gray-500">
                  {p.lastScore.replace("{{n}}", String(Math.round(set.myLastScore)))}
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: match score + controls ── */}
          <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-5 md:min-w-[160px] md:shrink-0">

            {/* Match score — primary visual if available */}
            {hasMatch && (
              <div className="flex flex-col items-center md:items-end gap-1.5" aria-label={`Khớp CV ${set.matchPercent}%`}>
                <div className="flex items-baseline gap-0.5 leading-none">
                  <span
                    className="text-[38px] sm:text-[44px] font-black tabular-nums text-violet-700 dark:text-violet-300"
                    aria-live="polite"
                  >
                    <AnimatedScore value={set.matchPercent!} active={inView} />
                  </span>
                  <span className="text-[22px] font-bold text-violet-600 dark:text-violet-400">%</span>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Khớp CV
                </div>
                {/* Progress bar */}
                <div className="w-20 h-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: inView ? `${Math.min(100, set.matchPercent!)}%` : "0%" }}
                  />
                </div>
              </div>
            )}

            {/* Controls row: bookmark + CTA */}
            <div className={cn(
              "flex items-center gap-2.5",
              hasMatch ? "md:mt-auto" : ""
            )}>
              {/* Bookmark */}
              <button
                type="button"
                onClick={handleBookmark}
                disabled={bookmarking}
                aria-label={bookmarked ? p.unsaveBtn : p.saveBtn}
                title={bookmarked ? p.unsaveBtn : p.saveBtn}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-150",
                  bookmarked
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-white/60 dark:bg-white/5 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/30"
                )}
              >
                {bookmarking
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Bookmark size={16} className={bookmarked ? "fill-primary" : ""} />}
              </button>

              {/* CTA */}
              <Link
                href={`/candidate/sets/${set.id}`}
                className="shimmer-button hr-cta-btn flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-semibold text-white group-hover:gap-3 transition-[gap] duration-150 whitespace-nowrap"
              >
                {p.startPractice}
                <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
