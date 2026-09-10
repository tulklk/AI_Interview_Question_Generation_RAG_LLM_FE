"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

export const PLAN_LOAD_STEP_COUNT = 4;
/** Cosmetic step cadence while the create-plan POST is in flight. */
export const PLAN_TICK_MS = 5_000;

/** Step index derived from elapsed time, so a remount resumes instead of restarting at 1. */
export function seedPlanLoadSteps(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;
  const elapsed = Date.now() - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.min(PLAN_LOAD_STEP_COUNT - 1, Math.floor(elapsed / PLAN_TICK_MS));
}

type Props = {
  /** ISO timestamp of the create-plan request; drives the internal step ticker. */
  startedAt?: string | null;
  /** Overrides the internal ticker when the caller already tracks the step. */
  completedSteps?: number;
  /** Shows every step done — used for the short rush once the plan arrives. */
  forceAllDone?: boolean;
};

/**
 * Plan-creation loading panel. Visibility must never depend on entry animations:
 * after a remount the first paint can land before they run, which leaves the whole
 * subtree stuck at the `from { opacity: 0 }` state of an `animation-fill-mode: both`
 * keyframe. Only looping decorations (spinner, indeterminate bar) are animated.
 */
export function PlanCreatingLoading({ startedAt = null, completedSteps, forceAllDone = false }: Props) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;

  const [ticked, setTicked] = useState(() => seedPlanLoadSteps(startedAt));
  useEffect(() => {
    if (completedSteps !== undefined) return;
    setTicked(seedPlanLoadSteps(startedAt));
    const id = window.setInterval(() => setTicked(seedPlanLoadSteps(startedAt)), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, completedSteps]);

  const PLAN_STEPS = [
    { label: c.planStep1, sub: c.stepExtracting },
    { label: c.planStep2, sub: c.stepFocusing },
    { label: c.planStep3, sub: c.stepStructuring },
    { label: c.planStep4, sub: c.stepFinalizing },
  ];

  const steps     = forceAllDone ? PLAN_LOAD_STEP_COUNT : (completedSteps ?? ticked);
  const allDone   = steps >= PLAN_STEPS.length;
  const activeIdx = allDone ? PLAN_STEPS.length - 1 : Math.min(steps, PLAN_STEPS.length - 1);

  return (
    <div className="flex min-h-[280px] w-full flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <AiLoadingSpinner />
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{c.streamingTitle}</p>
        <p className="mt-1 text-sm ai-status-text">{PLAN_STEPS[activeIdx].sub}</p>
      </div>
      {/* Indeterminate progress — plan creation (no fake %) */}
      <div className="w-full max-w-xs">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {c.planProgress}
          </span>
          <span className="text-[11px] font-medium text-gray-400">
            {c.stepOf.replace("{{current}}", String(activeIdx + 1)).replace("{{total}}", String(PLAN_STEPS.length))}
          </span>
        </div>
        <div className="studio-progress-indeterminate h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <span className="bg-linear-to-r from-primary to-primary/70" />
        </div>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {PLAN_STEPS.map((step, i) => {
          const done   = i < steps;
          const active = !allDone && i === steps;
          return (
            <div
              key={step.label}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-500",
                done   ? "bg-emerald-50 dark:bg-emerald-950/25"
                : active ? "bg-primary/8 dark:bg-primary/10"
                :          "bg-gray-50 dark:bg-gray-800/60"
              )}
            >
              {done ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-500" strokeWidth={3} />
              ) : active ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
              ) : (
                <Loader2 className="h-3 w-3 shrink-0 text-gray-300 opacity-30 dark:text-gray-600" />
              )}
              <span
                className={cn(
                  "transition-all duration-300",
                  done   ? "text-emerald-700 line-through dark:text-emerald-400"
                  : active ? "font-semibold text-gray-900 dark:text-gray-100"
                  :          "text-gray-400 opacity-40 dark:text-gray-600"
                )}
              >
                {step.label}
              </span>
              {done && (
                <span className="ml-auto text-[10px] font-semibold text-emerald-500">{c.stepDone}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
