"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CoachLevelCriteria } from "@/features/candidate/services/coach.service";

interface CoachLevelCriteriaProps {
  criteria: CoachLevelCriteria;
  className?: string;
  /** compact: ít padding — dùng trong report / wrap-up. */
  compact?: boolean;
}

type RowSpec = {
  labelKey:
    | "levelCriteriaOverall"
    | "levelCriteriaTargetMet"
    | "levelCriteriaRequired"
    | "levelCriteriaHard";
  hintKey:
    | "levelCriteriaOverallHint"
    | "levelCriteriaTargetMetHint"
    | "levelCriteriaRequiredHint"
    | "levelCriteriaHardHint";
  value: number;
  threshold: number;
  /** overall dùng thang 0–100; các ratio dùng 0–1. */
  asPercent: boolean;
};

/**
 * SCRUM-509: hiển thị 4 tiêu chí level dạng Đạt/Chưa đạt — không dump công thức ≥ thô.
 */
export function CoachLevelCriteriaPanel({
  criteria,
  className,
  compact = false,
}: CoachLevelCriteriaProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const rows: RowSpec[] = [
    {
      labelKey: "levelCriteriaOverall",
      hintKey: "levelCriteriaOverallHint",
      value: criteria.overall,
      threshold: criteria.overallThreshold,
      asPercent: false,
    },
    {
      labelKey: "levelCriteriaTargetMet",
      hintKey: "levelCriteriaTargetMetHint",
      value: criteria.targetMetRatio,
      threshold: criteria.targetMetThreshold,
      asPercent: true,
    },
    {
      labelKey: "levelCriteriaRequired",
      hintKey: "levelCriteriaRequiredHint",
      value: criteria.requiredRatio,
      threshold: criteria.requiredThreshold,
      asPercent: true,
    },
    {
      labelKey: "levelCriteriaHard",
      hintKey: "levelCriteriaHardHint",
      value: criteria.hardRatio,
      threshold: criteria.hardThreshold,
      asPercent: true,
    },
  ];

  return (
    <div
      className={cn(
        "space-y-2",
        !compact && "rounded-lg border border-gray-100 px-3 py-3 dark:border-gray-800",
        className
      )}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
        {p.levelCriteriaTitle}
      </p>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const met = row.value + 1e-9 >= row.threshold;
          const displayValue = row.asPercent
            ? `${Math.round(row.value * 100)}%`
            : row.value.toFixed(row.value % 1 === 0 ? 0 : 1);
          const displayThreshold = row.asPercent
            ? `${Math.round(row.threshold * 100)}%`
            : row.threshold.toFixed(row.threshold % 1 === 0 ? 0 : 1);
          const barPct = row.asPercent
            ? Math.min(100, Math.max(0, row.value * 100))
            : Math.min(100, Math.max(0, row.value));

          return (
            <li key={row.labelKey} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
                    {p[row.labelKey]}
                  </p>
                  <p className={cn("text-[10px] leading-snug", portalSubtextAlt)}>
                    {p[row.hintKey]}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    met
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                  )}
                >
                  {met ? <Check size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />}
                  {met ? p.levelCriteriaMet : p.levelCriteriaNotMet}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width]",
                      met ? "bg-emerald-500" : "bg-amber-400"
                    )}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <span className={cn("shrink-0 text-[11px] tabular-nums font-medium", portalHeadingAlt)}>
                  {displayValue}
                  <span className={cn("font-normal", portalSubtextAlt)}> / {displayThreshold}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
