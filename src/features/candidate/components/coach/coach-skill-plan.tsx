"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { Pill } from "@/features/candidate/components/ui/pill";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachPlanItem } from "@/features/candidate/services/coach.service";

interface CoachSkillPlanProps {
  items: CoachPlanItem[];
  isPremium: boolean;
  drillDisabled: boolean;
  onDrill: (skill: string) => void;
}

const ITEMS_PER_PAGE = 6;

const STATUS_PILL: Record<string, string> = {
  pending:     "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  in_progress: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  done:        "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
};

function progressPct(current: number | null | undefined, target: number): number {
  if (current == null || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${Math.round(delta)}`;
  return String(Math.round(delta));
}

/** Acronyms / short-forms that should always be fully uppercased. */
const KNOWN_ACRONYMS = new Set([
  "jwt", "sql", "api", "oop", "http", "https", "html", "css", "ui", "ux",
  "json", "xml", "rest", "grpc", "tcp", "ip", "os", "orm", "mvvm", "mvc",
  "aws", "gcp", "sdk", "ide", "cli", "ci", "cd", "url", "uri", "saas",
  "paas", "iaas", "ai", "ml", "dl", "nlp", "cv", "iot", "ssh", "tls",
  "ssl", "dns", "cdn", "seo", "sso", "rbac", "cors", "csrf",
]);

/**
 * Format a raw API skill name to display-friendly Title Case.
 * • Known acronyms  → ALL CAPS   (jwt → JWT, oop → OOP)
 * • Everything else → Title Case  (clean code → Clean Code)
 * • Already-cased names (React, TypeScript) are left untouched.
 */
function formatSkillName(skill: string): string {
  if (!skill) return skill;
  const trimmed = skill.trim();
  // If the original string already has mixed-case (was properly set by the API),
  // leave it as-is to preserve e.g. "TypeScript", "NavMeshAgent".
  const alpha = trimmed.replace(/[^a-zA-Z]/g, "");
  const lowerCount = (trimmed.match(/[a-z]/g) ?? []).length;
  const upperCount = (trimmed.match(/[A-Z]/g) ?? []).length;
  const alreadyMixed = lowerCount > 0 && upperCount > 0;
  if (alreadyMixed) return trimmed;

  // Otherwise apply word-level formatting
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      // Strip trailing punctuation for acronym check
      const bare = lower.replace(/[^a-z0-9]/g, "");
      if (KNOWN_ACRONYMS.has(bare)) return bare.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Framer Motion slide variants — direction: +1 = next (slide left), -1 = prev (slide right) */
const slideEaseIn = [0.25, 0.46, 0.45, 0.94] as const;
const slideEaseOut = [0.55, 0, 1, 0.45] as const;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "55%" : "-55%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.32, ease: slideEaseIn },
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-55%" : "55%",
    opacity: 0,
    transition: { duration: 0.24, ease: slideEaseOut },
  }),
};

export function CoachSkillPlan({ items, isPremium, drillDisabled, onDrill }: CoachSkillPlanProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  // [pageIndex, direction] — direction +1 = next, -1 = prev
  const [[page, dir], setPageDir] = useState<[number, number]>([0, 0]);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const pageItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  function goTo(next: number) {
    setPageDir(([cur]) => [next, next >= cur ? 1 : -1]);
  }

  const statusLabel = (status: string) => {
    const key = status as keyof typeof p.statuses;
    return p.statuses[key] ?? status;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className={cn("text-[16px] font-bold", portalHeadingAlt)}>{p.planTitle}</h2>
          <p className={cn("text-[13px] mt-0.5", portalSubtextAlt)}>{p.planSubtitle}</p>
        </div>
        {totalPages > 1 && (
          <p className={cn("text-[12px] shrink-0", portalSubtextAlt)}>
            {page + 1} / {totalPages}
          </p>
        )}
      </div>

      {/* Clip container so sliding cards don't overflow the section */}
      <div className="overflow-hidden">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={page}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
        {pageItems.map((item) => {
          const pct = progressPct(item.currentScore, item.targetScore);
          const baselinePct = progressPct(item.baselineScore, item.targetScore);
          const currentLabel = item.currentScore == null ? "—" : String(Math.round(item.currentScore));
          const hasCurrent = item.currentScore != null;
          const hasBaseline = item.baselineScore != null;
          // Only show delta when the candidate has a real scored result (score > 0).
          // score=0 almost always means "unscored yet", not a genuine zero result.
          const delta =
            hasCurrent && hasBaseline && item.currentScore! > 0
              ? item.currentScore! - item.baselineScore!
              : null;
          // When there IS baseline data but no real score yet, show a neutral hint
          // instead of the alarming red "-95" badge.
          const showNeutralDelta = item.currentScore === 0 && hasBaseline;
          const remaining =
            hasCurrent ? Math.max(0, Math.round(item.targetScore - item.currentScore!)) : null;
          const reached = hasCurrent && item.currentScore! >= item.targetScore;

          const skillIcon = getSkillIcon(item.skill);
          const SkillIcon = skillIcon?.icon;
          const displayName = formatSkillName(item.skill);

          return (
            <div key={item.id} className="hr-glass-card overflow-hidden flex flex-col">
              {/* ── Status accent strip ── */}
              <div className={cn(
                "h-0.75 w-full shrink-0",
                item.status === "done"
                  ? "bg-emerald-500"
                  : item.status === "in_progress"
                    ? "bg-amber-400"
                    : "bg-gray-200 dark:bg-gray-700"
              )} />

              <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                {/* ── Header: icon + name + status badge ── */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                      {SkillIcon ? (
                        <SkillIcon size={16} className={cn("shrink-0", skillIcon.className)} />
                      ) : (
                        <span className={cn("text-[10px] font-bold leading-none", portalSubtextAlt)}>
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <p className={cn("text-[14px] font-bold leading-snug", portalHeadingAlt)}>
                      {displayName}
                    </p>
                  </div>
                  <Pill size="sm" className={cn("shrink-0 mt-0.5", STATUS_PILL[item.status] ?? STATUS_PILL.pending)}>
                    {statusLabel(item.status)}
                  </Pill>
                </div>

                {/* ── Score + progress ── */}
                <div className="space-y-1.5">
                  {/* Score row */}
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn(
                        "text-[22px] font-extrabold leading-none tabular-nums",
                        !hasCurrent
                          ? "text-gray-300 dark:text-gray-600"
                          : reached
                            ? "text-emerald-600 dark:text-emerald-400"
                            : portalHeadingAlt
                      )}>
                        {currentLabel}
                      </span>
                      <span className={cn("text-[12px] font-medium pb-0.5", portalSubtextAlt)}>
                        / {item.targetScore}
                      </span>
                    </div>
                    {delta != null ? (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0",
                        delta > 0
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                          : delta < 0
                            ? "bg-red-50 dark:bg-red-950/25 text-red-500 dark:text-red-400/80"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      )}>
                        {delta > 0
                          ? <TrendingUp size={10} />
                          : delta < 0
                            ? <TrendingDown size={10} />
                            : <Minus size={10} />}
                        {fillTemplate(p.deltaVsBaseline, { delta: formatDelta(delta) })}
                      </span>
                    ) : showNeutralDelta ? (
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] px-1.5 py-0.5 rounded-md shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                        <Minus size={9} />
                        {p.noCompareData}
                      </span>
                    ) : null}
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-visible">
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700",
                          item.status === "done"
                            ? "bg-linear-to-r from-emerald-400 to-emerald-500"
                            : "bg-linear-to-r from-primary/80 to-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {hasBaseline && (
                      <span
                        title={p.baselineMark}
                        aria-label={p.baselineMark}
                        role="presentation"
                        className="absolute top-1/2 -translate-y-1/2 w-px h-3 rounded-full bg-gray-300/90 dark:bg-gray-500/70"
                        style={{ left: `calc(${baselinePct}% - 0.5px)` }}
                      />
                    )}
                  </div>

                  {/* Status message */}
                  <p className={cn("text-[12px]", portalSubtextAlt)}>
                    {!hasCurrent
                      ? p.noScoreYet
                      : reached
                        ? p.reachedTarget
                        : fillTemplate(p.remainingToTarget, { points: String(remaining) })}
                  </p>
                </div>

                {/* ── Drill button ── */}
                {item.status !== "done" && isPremium && (
                  <div className="mt-auto pt-1">
                    <button
                      type="button"
                      disabled={drillDisabled}
                      onClick={() => onDrill(item.skill)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border border-primary/25 text-primary disabled:opacity-50 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                    >
                      {p.drill}
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </motion.div>
      </AnimatePresence>
      </div>

      {/* ── Pagination controls — ‹ N / total › style ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => goTo(page - 1)}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
              "border-gray-200 dark:border-gray-700",
              page === 0
                ? "opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600"
                : "text-gray-600 dark:text-gray-300 hover:border-primary/40 hover:text-primary"
            )}
          >
            <ChevronLeft size={15} />
          </button>

          <span className={cn("text-[13px] font-semibold tabular-nums min-w-10 text-center", portalSubtextAlt)}>
            {page + 1} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page === totalPages - 1}
            onClick={() => goTo(page + 1)}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
              "border-gray-200 dark:border-gray-700",
              page === totalPages - 1
                ? "opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600"
                : "text-gray-600 dark:text-gray-300 hover:border-primary/40 hover:text-primary"
            )}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
