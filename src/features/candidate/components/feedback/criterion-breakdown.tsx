"use client";

import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";
import { getScoreBandBarClass } from "@/features/hr/utils/score-band";
import type { CriterionScore } from "@/features/candidate/services/practice-session.service";

/**
 * Điểm từng tiêu chí rubric của HR + trọng số, và phép tính ra điểm câu.
 * Dùng chung cho trang feedback của candidate và trang xem của HR để hai bên thấy cùng một con số.
 */
export function CriterionBreakdown({ criteria, total }: { criteria: CriterionScore[]; total: number | null }) {
  const { t } = useLanguage();
  const p = t.jobseekerFeedbackPage;
  if (criteria.length === 0) return null;

  // Hiện luôn phép nhân để người đọc tự kiểm lại được: 80×60% + 50×40% = 68
  const formula = criteria.map((c) => `${Math.round(c.score)}×${c.weight}%`).join(" + ");

  return (
    <div className="flex flex-col gap-2">
      <p className={cn("text-[11px] font-[700] uppercase tracking-wide", portalSubtextAlt)}>{p.criteriaTitle}</p>
      <ul className="flex flex-col gap-2">
        {criteria.map((c) => (
          <li key={c.code} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-gray-800 dark:text-gray-100">
                {c.label}
                <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {c.weight}%
                </span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-gray-900 dark:text-white">{Math.round(c.score)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={cn("h-full rounded-full", getScoreBandBarClass(c.score).bar)}
                style={{ width: `${Math.max(0, Math.min(100, c.score))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {total !== null && (
        <p className={cn("text-[12px] tabular-nums", portalSubtextAlt)}>
          {p.criteriaFormulaPrefix} {formula} = <span className="font-bold text-gray-900 dark:text-white">{Math.round(total)}</span>
        </p>
      )}
    </div>
  );
}
