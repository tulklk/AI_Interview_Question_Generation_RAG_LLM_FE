"use client";

import { FileText, Sparkles, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export type CoachStepIndex = 1 | 2 | 3;

interface CoachStepsProps {
  activeStep: CoachStepIndex;
}

// Always use the original step icons (no CheckCircle2 swap — progress bar carries state)
const ICONS: LucideIcon[] = [FileText, Sparkles, Target];

/** How much of the progress bar to fill per active step */
const PROGRESS_PCT: Record<CoachStepIndex, number> = { 1: 0, 2: 50, 3: 100 };

export function CoachSteps({ activeStep }: CoachStepsProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const steps = [
    { title: p.step1Title, desc: p.step1Desc },
    { title: p.step2Title, desc: p.step2Desc },
    { title: p.step3Title, desc: p.step3Desc },
  ];

  const pct = PROGRESS_PCT[activeStep];
  const barColor = pct === 100 ? "bg-emerald-500" : "bg-primary";

  return (
    <>
      {/* Scoped keyframe for the shimmer light sweep */}
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

      <div className="hr-glass-card px-6 py-5">
        {/* Header label */}
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-5", portalSubtextAlt)}>
          {p.howTitle}
        </p>

        {/* Horizontal stepper */}
        <div className="flex items-start">
          {steps.map((step, i) => {
            const n = (i + 1) as CoachStepIndex;
            const isLast = i === steps.length - 1;
            const Icon = ICONS[i];

            return (
              <div
                key={n}
                className={cn(
                  "flex items-start gap-3",
                  isLast ? "shrink-0" : "flex-1 min-w-0"
                )}
              >
                {/* Circle indicator — uniform neutral color; progress bar shows state */}
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border-2 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-all duration-300">
                  <Icon size={15} />
                </div>

                {/* Step text */}
                <div className="min-w-0 pt-0.5">
                  <p className={cn("text-[13px] font-semibold leading-tight", portalHeadingAlt)}>
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] mt-0.5 leading-4",
                      !isLast && "pr-5",
                      portalSubtextAlt
                    )}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Progress bar with shimmer ── */}
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
