"use client";

import {
  FileText,
  Map,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

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

  return (
    <>
      <style>{`
        @keyframes _cs_shimmer {
          0%   { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(450%)  skewX(-12deg); }
        }
        ._cs_shimmer_stripe {
          position: absolute;
          top: 0; bottom: 0;
          width: 35%;
          background: linear-gradient(
            90deg,
            transparent            0%,
            rgba(255,255,255,0.55) 50%,
            transparent            100%
          );
          animation: _cs_shimmer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="hr-glass-card px-4 sm:px-6 py-5">
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-5", portalSubtextAlt)}>
          {p.howTitle}
        </p>

        {earlierLocked && (
          <p className={cn("text-[11px] mb-3 -mt-2", portalSubtextAlt)}>{p.stepsLockedAfterRoadmap}</p>
        )}

        <div className="flex items-start overflow-x-auto pb-1 gap-0">
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
                  "flex items-start gap-2 sm:gap-3",
                  isLast ? "shrink-0" : "flex-1 min-w-[120px] sm:min-w-0"
                )}
              >
                <button
                  type="button"
                  disabled={!unlocked}
                  title={!unlocked && n < minSelectableStep ? p.stepsLockedAfterRoadmap : undefined}
                  onClick={() => onSelect(n)}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center border-2 transition-all duration-300",
                    unlocked ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-50",
                    isActive
                      ? "bg-primary/10 border-primary text-primary"
                      : isPast && unlocked
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                        : isPast && !unlocked
                          ? "bg-gray-100 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600 text-gray-400"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                  )}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={step.title}
                >
                  <Icon size={14} />
                </button>

                <button
                  type="button"
                  disabled={!unlocked}
                  title={!unlocked && n < minSelectableStep ? p.stepsLockedAfterRoadmap : undefined}
                  onClick={() => onSelect(n)}
                  className={cn(
                    "min-w-0 pt-0.5 text-left",
                    unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <p
                    className={cn(
                      "text-[12px] sm:text-[13px] font-semibold leading-tight",
                      isActive ? "text-primary" : portalHeadingAlt
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] sm:text-[11px] mt-0.5 leading-4 hidden sm:block",
                      !isLast && "pr-3",
                      portalSubtextAlt
                    )}
                  >
                    {step.desc}
                  </p>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={cn(
              "relative h-full rounded-full transition-[width] duration-700 overflow-hidden",
              barColor
            )}
            style={{ width: `${pct}%` }}
          >
            {pct > 0 && <div className="_cs_shimmer_stripe" />}
          </div>
        </div>
      </div>
    </>
  );
}
