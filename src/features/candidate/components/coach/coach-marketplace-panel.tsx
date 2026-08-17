"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, RefreshCw, Sparkles, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { listQuestionSets } from "@/features/candidate/services/question-set.service";
import { cleanTitle } from "@/features/candidate/utils/clean-title";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";

const PANEL_SIZE = 6;

function difficultyClass(d: string) {
  const v = d.toLowerCase();
  if (v === "easy") return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400";
  if (v === "hard") return "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400";
  return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
}

function SetRow({ set, rank }: { set: QuestionSet; rank: number }) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const matchPct = set.matchPercent ?? 0;
  const hasMatch = matchPct > 0;
  /** Top-ranked AND highest match — show a "best fit" highlight strip */
  const isBest = rank === 0 && hasMatch;

  return (
    <Link
      href={`/candidate/sets/${set.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors group",
        "border-b border-gray-100 dark:border-gray-800 last:border-0",
        isBest
          ? "bg-violet-50/60 dark:bg-violet-950/20 hover:bg-violet-50 dark:hover:bg-violet-950/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
      )}
    >
      {/* Company logo / avatar */}
      {set.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={set.companyLogoUrl}
          alt={set.company}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-9 h-9 rounded-lg object-cover shrink-0 border",
            isBest
              ? "border-violet-200 dark:border-violet-800"
              : "border-gray-100 dark:border-gray-700"
          )}
        />
      ) : (
        <div
          className={cn(
            "w-9 h-9 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0",
            set.companyColor
          )}
        >
          {set.companyInitials}
        </div>
      )}

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={cn("text-[13px] font-semibold truncate leading-snug", portalHeadingAlt)}>
            {cleanTitle(set.title)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {/* CV match badge */}
          {hasMatch && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
              <Sparkles size={9} />
              Khớp CV {Math.round(matchPct)}%
            </span>
          )}
          {hasMatch && (
            <span className={cn("text-[10px]", portalSubtextAlt)}>·</span>
          )}
          <p className={cn("text-[11px] truncate", portalSubtextAlt)}>
            {set.company || p.marketplaceCardTitle}
            {set.totalQuestions > 0 && (
              <span className="before:content-['·'] before:mx-1">{set.totalQuestions} {p.questionsUnit}</span>
            )}
          </p>
        </div>
      </div>

      {/* Right: difficulty */}
      <span className={cn(
        "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
        difficultyClass(set.difficulty)
      )}>
        {set.difficulty === "Easy" ? p.easy : set.difficulty === "Hard" ? p.hard : p.medium}
      </span>
    </Link>
  );
}

export function CoachMarketplacePanel() {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cancelledRef = useRef(false);

  function fetchSets() {
    cancelledRef.current = false;
    setLoading(true);
    setError(false);

    listQuestionSets({ pageSize: PANEL_SIZE, sortBy: "best_match" })
      .then((res) => {
        if (cancelledRef.current) return;
        // Sort: highest matchPercent first; missing/zero fall to the end
        const sorted = [...res.items].sort((a, b) => {
          const pa = typeof a.matchPercent === "number" ? a.matchPercent : -1;
          const pb = typeof b.matchPercent === "number" ? b.matchPercent : -1;
          return pb - pa;
        });
        setSets(sorted);
      })
      .catch(() => {
        if (!cancelledRef.current) setError(true);
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });
  }

  useEffect(() => {
    fetchSets();
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hr-glass-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
          <Store size={12} className="text-charcoal dark:text-gray-100" />
        </div>
        <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{p.marketplaceCardTitle}</p>
      </div>

      {/* Body */}
      <div className="flex flex-col">
        {/* ── Loading ── */}
        {loading && (
          <div className="px-5 py-3 space-y-3">
            {Array.from({ length: PANEL_SIZE }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-4 w-12 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-8 px-5 text-center">
            <AlertCircle size={20} className="text-red-400" />
            <p className={cn("text-[12px]", portalSubtextAlt)}>Không tải được bộ đề</p>
            <button
              type="button"
              onClick={fetchSets}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              <RefreshCw size={11} />
              Thử lại
            </button>
          </div>
        )}

        {/* ── Set list ── */}
        {!loading && !error && (
          <>
            {sets.length === 0 ? (
              <p className={cn("px-5 py-6 text-[12px] text-center", portalSubtextAlt)}>
                Chưa có bộ đề nào.
              </p>
            ) : (
              sets.map((set, i) => <SetRow key={set.id} set={set} rank={i} />)
            )}

            {/* Footer CTA */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Link
                href="/candidate/practice"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
              >
                Xem tất cả
                <ArrowRight size={12} />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
