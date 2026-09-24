"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, RefreshCw, Sparkles, Store } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { listQuestionSets } from "@/features/candidate/services/question-set.service";
import { cleanTitle } from "@/features/candidate/utils/clean-title";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { fadeUp, motionSafe } from "@/features/candidate/components/coach/coach-motion";

const PANEL_SIZE = 2;

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
  const isBest = rank === 0 && hasMatch;
  const diffLabel =
    set.difficulty === "Easy" ? p.easy : set.difficulty === "Hard" ? p.hard : p.medium;

  return (
    <Link
      href={set.isHiringAssessment ? `/candidate/jobs/${set.id}` : `/candidate/sets/${set.id}`}
      className={cn(
        "group flex items-start gap-2.5 px-3 py-3 transition-colors",
        "border-b border-gray-100 dark:border-gray-800 last:border-0",
        isBest
          ? "bg-violet-50/60 hover:bg-violet-50 dark:bg-violet-950/20 dark:hover:bg-violet-950/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
      )}
    >
      {set.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={set.companyLogoUrl}
          alt={set.company}
          loading="lazy"
          decoding="async"
          className={cn(
            "mt-0.5 h-9 w-9 shrink-0 rounded-lg border object-cover",
            isBest
              ? "border-violet-200 dark:border-violet-800"
              : "border-gray-100 dark:border-gray-700"
          )}
        />
      ) : (
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white",
            set.companyColor
          )}
        >
          {set.companyInitials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-[12px] font-semibold leading-snug", portalHeadingAlt)}>
          {cleanTitle(set.title)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {hasMatch && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
              <Sparkles size={8} />
              {fillTemplate(t.jobseekerMarketplacePage.matchPercent, {
                n: String(Math.round(matchPct)),
              })}
            </span>
          )}
          <span
            className={cn(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded-md",
              difficultyClass(set.difficulty)
            )}
          >
            {diffLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface CoachMarketplacePanelProps {
  /** Skill trong lộ trình — ưu tiên bộ đề khớp các skill này. */
  skills?: string[];
}

export function CoachMarketplacePanel({ skills = [] }: CoachMarketplacePanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const safe = motionSafe(reduced);

  const skillKey = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of skills) {
      const key = raw.trim();
      if (!key) continue;
      const norm = key.toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      out.push(key);
      if (out.length >= 8) break;
    }
    return out.join("|");
  }, [skills]);

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const currentSkills = skillKey ? skillKey.split("|") : [];

    async function load() {
      try {
        const params = {
          pageSize: PANEL_SIZE,
          sortBy: "best_match" as const,
          isHiringAssessment: false,
          ...(currentSkills.length > 0 ? { skills: currentSkills } : { chip: "cv" as const }),
        };
        let res = await listQuestionSets(params);
        if (res.items.length === 0 && currentSkills.length > 0) {
          res = await listQuestionSets({
            pageSize: PANEL_SIZE,
            sortBy: "best_match",
            chip: "cv",
            isHiringAssessment: false,
          });
        }
        if (cancelled) return;
        const sorted = [...res.items].sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));
        setSets(sorted.slice(0, PANEL_SIZE));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [skillKey, reloadKey]);

  return (
    <motion.div className="hr-glass-card flex flex-col overflow-hidden" variants={fadeUp} {...safe}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Store size={12} className="text-primary" />
        </div>
        <p className={cn("min-w-0 text-[12px] font-semibold", portalHeadingAlt)}>
          {p.marketplaceSectionTitle}
        </p>
      </div>

      <div className="flex flex-col">
        {loading && (
          <div className="px-4 py-3 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
            <AlertCircle size={18} className="text-red-400" />
            <p className={cn("text-[11px]", portalSubtextAlt)}>{p.marketplaceLoadFailed}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <RefreshCw size={11} />
              {p.marketplaceRetry}
            </button>
          </div>
        )}

        {!loading && !error && sets.length === 0 && (
          <p className={cn("px-4 py-6 text-[11px] text-center", portalSubtextAlt)}>
            {p.marketplaceEmpty}
          </p>
        )}

        {!loading && !error && sets.length > 0 && (
          <>
            {sets.map((set, i) => (
              <SetRow key={set.id} set={set} rank={i} />
            ))}
            <div className="flex justify-end border-t border-gray-100 px-4 py-2 dark:border-gray-800">
              <Link
                href="/candidate/practice"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                {p.marketplaceSeeAll}
                <ArrowRight size={11} />
              </Link>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
