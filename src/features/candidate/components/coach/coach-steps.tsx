"use client";

import { Check, type LucideIcon } from "lucide-react";
import {
  FileText,
  Map,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
  BarChart3,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { coachTransitionFast } from "@/features/candidate/components/coach/coach-motion";

/** 7 phase wizard: CV → Analysis → Goal → Diagnostic → Report → Roadmap → Reassess */
export type CoachStepIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface CoachStepsProps {
  activeStep: CoachStepIndex;
  maxUnlockedStep: CoachStepIndex;
  /** Khi đã có lộ trình: khóa step trước (vd. 6 = chỉ chọn 6–7). */
  minSelectableStep?: CoachStepIndex;
  onSelect: (step: CoachStepIndex) => void;
}

const ICONS: LucideIcon[] = [Upload, FileText, Target, Sparkles, BarChart3, Map, RefreshCw];

const PROGRESS_PCT: Record<CoachStepIndex, number> = {
  1: 0,
  2: 16,
  3: 32,
  4: 48,
  5: 64,
  6: 82,
  7: 100,
};

export function CoachSteps({
  activeStep,
  maxUnlockedStep,
  minSelectableStep = 1,
  onSelect,
}: CoachStepsProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const steps = [
    { title: p.phaseCvTitle, desc: p.phaseCvDesc },
    { title: p.phaseAnalysisTitle, desc: p.phaseAnalysisDesc },
    { title: p.phaseGoalTitle, desc: p.phaseGoalDesc },
    { title: p.phaseDiagnosticTitle, desc: p.phaseDiagnosticDesc },
    { title: p.phaseReportTitle, desc: p.phaseReportDesc },
    { title: p.phaseRoadmapTitle, desc: p.phaseRoadmapDesc },
    { title: p.phaseReassessTitle, desc: p.phaseReassessDesc },
  ];

  const pct = PROGRESS_PCT[activeStep];
  const barColor = pct === 100 ? "bg-emerald-500" : "bg-primary";
  const earlierLocked = minSelectableStep > 1;
  const activeDesc = steps[activeStep - 1]?.desc;

  return (
    <div className="hr-glass-card px-3 py-3 sm:px-4">
      <p className={cn("mb-2 text-[10px] font-bold uppercase tracking-widest", portalSubtextAlt)}>
        {p.howTitle}
      </p>

      {earlierLocked && (
        <p className={cn("mb-1.5 text-[11px]", portalSubtextAlt)}>{p.stepsLockedAfterRoadmap}</p>
      )}

      <div className="flex items-center gap-0 overflow-x-auto pb-0.5">
        {steps.map((step, i) => {
          const n = (i + 1) as CoachStepIndex;
          const isLast = i === steps.length - 1;
          const Icon = ICONS[i];
          const isActive = n === activeStep;
          const isPast = n < activeStep;
          const unlocked = n >= minSelectableStep && n <= maxUnlockedStep;

          return (
            <div
              key={n}
              className={cn(
                "flex items-center gap-1",
                isLast ? "shrink-0" : "min-w-22 flex-1 sm:min-w-0"
              )}
            >
              <button
                type="button"
                disabled={!unlocked}
                title={!unlocked && n < minSelectableStep ? p.stepsLockedAfterRoadmap : undefined}
                onClick={() => onSelect(n)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 text-center transition-colors",
                  unlocked ? "cursor-pointer" : "cursor-not-allowed"
                )}
                aria-current={isActive ? "step" : undefined}
                aria-label={step.title}
              >
                <motion.span
                  layout={!reduced}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    unlocked ? "" : "opacity-60",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : isPast && unlocked
                        ? "border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  )}
                  animate={
                    reduced
                      ? undefined
                      : isActive
                        ? { scale: 1.08 }
                        : { scale: 1 }
                  }
                  transition={coachTransitionFast}
                >
                  {isPast && unlocked ? <Check size={12} strokeWidth={2.5} /> : <Icon size={11} />}
                </motion.span>
                <span
                  className={cn(
                    "max-w-22 truncate text-[10px] font-semibold leading-tight sm:max-w-none sm:text-[11px]",
                    isActive ? "text-primary" : unlocked ? portalHeadingAlt : portalSubtextAlt
                  )}
                >
                  {step.title}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.45, ease: [0.2, 0, 0, 1] }}
        />
      </div>

      {activeDesc && (
        <motion.p
          key={activeStep}
          className={cn("mt-2 text-[11px] leading-snug sm:text-[12px]", portalSubtextAlt)}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={coachTransitionFast}
        >
          {activeDesc}
        </motion.p>
      )}
    </div>
  );
}
