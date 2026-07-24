"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bookmark, AlertCircle, RefreshCw,
  BarChart2, Clock, Users, Star, ChevronRight, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { listBookmarkedQuestionSets, toggleBookmark } from "@/features/candidate/services/question-set.service";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

const MAX_SKILLS = 3;

function CompanyLogo({ set }: { set: QuestionSet }) {
  if (set.companyLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={set.companyLogoUrl}
        alt={set.company}
        referrerPolicy="no-referrer"
        className="w-9 h-9 rounded-lg object-cover border border-gray-100 dark:border-gray-700 shrink-0"
      />
    );
  }
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0", set.companyColor)}>
      {set.companyInitials}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={10}
          className={s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"}
        />
      ))}
      <span className={cn("text-[11px] font-semibold ml-1 tabular-nums", portalHeadingAlt)}>{rating.toFixed(1)}</span>
    </div>
  );
}

function SavedRow({
  set,
  onRemove,
  index = 0,
}: {
  set: QuestionSet;
  onRemove: (id: string) => void;
  index?: number;
}) {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const { addToast } = useToast();
  const [removing, setRemoving] = useState(false);

  const visibleSkills = set.skills.slice(0, MAX_SKILLS);
  const extra = set.skills.length - MAX_SKILLS;

  async function handleRemove() {
    if (removing) return;
    setRemoving(true);
    try {
      await toggleBookmark(set.id);
      addToast("success", p.bookmarkUnsaved);
      onRemove(set.id);
    } catch {
      addToast("error", p.bookmarkFailed);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.18 + index * 0.07, ease: "easeOut" }}
      className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
    >
      {/* Logo */}
      <CompanyLogo set={set} />

      {/* Title + company */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold leading-tight truncate", portalHeadingAlt)}>{set.title}</p>
        <p className={cn("text-[11px] mt-0.5 truncate", portalSubtextAlt)}>{set.company}</p>
      </div>

      {/* Skills */}
      <div className="hidden md:flex items-center gap-1.5 w-56 shrink-0">
        {visibleSkills.map((sk) => (
          <span key={sk} className="min-w-0 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/30 text-[10px] font-medium px-2 py-0.5 rounded-md truncate" style={{ maxWidth: "7rem" }}>
            {sk}
          </span>
        ))}
        {extra > 0 && (
          <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-md">
            +{extra}
          </span>
        )}
      </div>

      {/* Difficulty */}
      <div className="hidden sm:block shrink-0">
        <DifficultyPill difficulty={set.difficulty} label={set.difficulty} />
      </div>

      {/* Stats */}
      <div className={cn("hidden lg:flex items-center gap-3 text-[11px] shrink-0 w-40", portalSubtextAlt)}>
        <span className="flex items-center gap-1">
          <BarChart2 size={11} className="shrink-0" />
          {set.totalQuestions}q
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} className="shrink-0" />
          {set.estimatedTime}
        </span>
        {set.attempts !== undefined && (
          <span className="flex items-center gap-1">
            <Users size={11} className="shrink-0" />
            {set.attempts}
          </span>
        )}
      </div>

      {/* Rating */}
      {set.rating !== undefined ? (
        <div className="hidden xl:block shrink-0 w-20">
          <StarRating rating={set.rating} />
        </div>
      ) : (
        <div className="hidden xl:block shrink-0 w-20" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/jobseeker/sets/${set.id}`}
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
        >
          {t.jobseekerMarketplacePage.startPractice}
          <ChevronRight size={12} />
        </Link>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          title={t.jobseekerMarketplacePage.unsaveBtn}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
        >
          {removing ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
        </button>
      </div>
    </motion.div>
  );
}

export function SavedSetsPage() {
  const { t } = useLanguage();
  const p = t.jobseekerSavedPage;

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listBookmarkedQuestionSets()
      .then((items) => { if (!cancelled) setSets(items); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  function handleRemove(id: string) {
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className={cn("text-[22px] font-extrabold", portalHeadingAlt)}>{p.heading}</h1>
          <p className={cn("text-[13px] mt-1", portalSubtextAlt)}>{p.subtext}</p>
        </div>
        {!loading && !error && sets.length > 0 && (
          <span className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
            {sets.length} {sets.length === 1 ? "set" : "sets"}
          </span>
        )}
      </motion.div>

      {loading ? (
        <div className="hr-glass-card overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-2.5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="hidden md:flex gap-1.5">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
              </div>
              <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {p.retryBtn}
          </button>
        </div>
      ) : sets.length === 0 ? (
        <EmptyState icon={Bookmark} title={p.emptyState} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="hr-glass-card overflow-hidden"
        >
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
            <div className="w-9 shrink-0" />
            <p className={cn("flex-1 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>Question Set</p>
            <p className={cn("hidden md:block w-56 shrink-0 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>Skills</p>
            <p className={cn("hidden sm:block shrink-0 w-16 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>Level</p>
            <p className={cn("hidden lg:block shrink-0 w-40 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>Stats</p>
            <p className={cn("hidden xl:block shrink-0 w-20 text-[10px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>Rating</p>
            <div className="shrink-0 w-28" />
          </div>

          {sets.map((set, i) => (
            <SavedRow key={set.id} set={set} onRemove={handleRemove} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
