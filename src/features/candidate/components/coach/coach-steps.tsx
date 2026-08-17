"use client";

import { CheckCircle2, FileText, Sparkles, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export type CoachStepIndex = 1 | 2 | 3;

interface CoachStepsProps {
  activeStep: CoachStepIndex;
}

const ICONS: LucideIcon[] = [FileText, Sparkles, Target];

export function CoachSteps({ activeStep }: CoachStepsProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const steps = [
    { title: p.step1Title, desc: p.step1Desc },
    { title: p.step2Title, desc: p.step2Desc },
    { title: p.step3Title, desc: p.step3Desc },
  ];

  return (
    <div className="hr-glass-card p-4 sm:p-5">
      <p className={cn("text-[11px] font-[700] uppercase tracking-wider mb-4", portalSubtextAlt)}>{p.howTitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {steps.map((step, i) => {
          const n = (i + 1) as CoachStepIndex;
          const done = n < activeStep;
          const active = n === activeStep;
          const Icon = done ? CheckCircle2 : ICONS[i];
          return (
            <div key={step.title} className="relative flex gap-3">
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="hidden sm:block absolute top-4 left-[calc(2rem+8px)] right-[-8px] h-px bg-gray-200 dark:bg-gray-800"
                />
              )}
              <div
                className={cn(
                  "relative z-[1] w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  done && "bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
                  active && "bg-primary/10 border-primary/30 text-primary",
                  !done && !active && "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                )}
              >
                <Icon size={14} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{step.title}</p>
                <p className={cn("text-[12px] mt-0.5 leading-[17px]", portalSubtextAlt)}>{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
