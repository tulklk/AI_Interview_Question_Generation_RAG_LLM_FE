"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { Pill } from "@/features/candidate/components/ui/pill";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import type { CoachPlanItem } from "@/features/candidate/services/coach.service";

interface CoachSkillPlanProps {
  items: CoachPlanItem[];
  isPremium: boolean;
  drillDisabled: boolean;
  onDrill: (skill: string) => void;
}

const STATUS_PILL: Record<string, string> = {
  pending: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  in_progress: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  done: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
};

function progressPct(current: number | null | undefined, target: number): number {
  if (current == null || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${Math.round(delta)}`;
  return String(Math.round(delta));
}

export function CoachSkillPlan({ items, isPremium, drillDisabled, onDrill }: CoachSkillPlanProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const statusLabel = (status: string) => {
    const key = status as keyof typeof p.statuses;
    return p.statuses[key] ?? status;
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className={cn("text-[16px] font-bold", portalHeadingAlt)}>{p.planTitle}</h2>
        <p className={cn("text-[13px] mt-0.5", portalSubtextAlt)}>{p.planSubtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => {
          const pct = progressPct(item.currentScore, item.targetScore);
          const baselinePct = progressPct(item.baselineScore, item.targetScore);
          const currentLabel = item.currentScore == null ? "—" : String(Math.round(item.currentScore));
          const hasCurrent = item.currentScore != null;
          const hasBaseline = item.baselineScore != null;
          const delta =
            hasCurrent && hasBaseline ? item.currentScore! - item.baselineScore! : null;
          const remaining =
            hasCurrent ? Math.max(0, Math.round(item.targetScore - item.currentScore!)) : null;
          const reached = hasCurrent && item.currentScore! >= item.targetScore;

          return (
            <div key={item.id} className="hr-glass-card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{item.skill}</p>
                <Pill size="sm" className={STATUS_PILL[item.status] ?? STATUS_PILL.pending}>
                  {statusLabel(item.status)}
                </Pill>
              </div>
              <div>
                <div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-visible">
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        item.status === "done" ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {hasBaseline && (
                    <span
                      title={p.baselineMark}
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-gray-500 dark:bg-gray-300"
                      style={{ left: `calc(${baselinePct}% - 1px)` }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <p className={cn("text-[11px]", portalSubtextAlt)}>
                    {fillTemplate(p.progressOfTarget, {
                      current: currentLabel,
                      target: String(item.targetScore),
                    })}
                  </p>
                  {delta != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                        delta > 0 && "text-emerald-600 dark:text-emerald-400",
                        delta < 0 && "text-red-600 dark:text-red-400",
                        delta === 0 && "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {delta > 0 ? <TrendingUp size={11} /> : delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                      {fillTemplate(p.deltaVsBaseline, { delta: formatDelta(delta) })}
                    </span>
                  )}
                </div>
                <p className={cn("text-[11px] mt-1", portalSubtextAlt)}>
                  {!hasCurrent
                    ? p.noScoreYet
                    : reached
                      ? p.reachedTarget
                      : fillTemplate(p.remainingToTarget, { points: String(remaining) })}
                </p>
              </div>
              {item.status !== "done" && isPremium && (
                <button
                  type="button"
                  disabled={drillDisabled}
                  onClick={() => onDrill(item.skill)}
                  className="self-start h-8 px-3 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-700 text-primary disabled:opacity-50 hover:border-primary/40 transition-colors"
                >
                  {p.drill}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
