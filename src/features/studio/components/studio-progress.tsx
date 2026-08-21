"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { GenerationRun, PlanDetail } from "@/features/studio/types/studio.types";

export type StudioFlowStepId = "jd" | "plan" | "approve" | "generate";

function isStepDone(
  id: StudioFlowStepId,
  hasJd: boolean,
  plan: PlanDetail | null,
  questionCount: number
): boolean {
  switch (id) {
    case "jd":       return hasJd;
    case "plan":     return Boolean(plan);
    case "approve":  return plan?.status === "Approved";
    case "generate": return questionCount > 0;
    default:         return false;
  }
}

export function resolveStudioFlowStep(input: {
  hasJd: boolean;
  plan: PlanDetail | null;
  questionCount: number;
}): StudioFlowStepId {
  const { hasJd, plan, questionCount } = input;
  if (!hasJd)                       return "jd";
  if (!plan)                        return "plan";
  if (plan.status !== "Approved")   return "approve";
  if (questionCount <= 0)           return "generate";
  return "generate";
}

interface Props {
  hasJd: boolean;
  plan: PlanDetail | null;
  questionCount: number;
  isGenerating: boolean;
  isStreaming?: boolean;
  isApplying?: boolean;
  generationRun?: GenerationRun | null;
}

export function StudioProgressBar({
  hasJd,
  plan,
  questionCount,
  isGenerating,
  isStreaming,
  isApplying,
  generationRun,
}: Props) {
  const { t } = useLanguage();
  const s = t.studioPage;

  const STEPS: { id: StudioFlowStepId; label: string }[] = [
    { id: "jd",       label: s.steps.jd },
    { id: "plan",     label: s.steps.plan },
    { id: "approve",  label: s.steps.approve },
    { id: "generate", label: s.steps.generate },
  ];

  const current = resolveStudioFlowStep({ hasJd, plan, questionCount });
  const isBusy = isStreaming || isApplying || isGenerating;

  type ChipVariant = "busy" | "done" | "action" | "ready" | "idle";
  const chipInfo: { text: string; variant: ChipVariant } = (() => {
    if (isApplying)  return { text: s.chip.updatingPlan, variant: "busy" };
    if (isStreaming) return { text: s.chip.creatingPlan, variant: "busy" };
    if (isGenerating) {
      const text = generationRun?.requestedQuestionCount
        ? s.chip.generatingCount
            .replace("{{done}}", String(Math.min(generationRun.generatedQuestionCount ?? 0, generationRun.requestedQuestionCount)))
            .replace("{{total}}", String(generationRun.requestedQuestionCount))
        : s.chip.generatingQuestions;
      return { text, variant: "busy" };
    }
    if (questionCount > 0)           return { text: s.chip.done.replace("{{count}}", String(questionCount)), variant: "done" };
    if (plan?.status === "Approved") return { text: s.chip.planApprovedReady, variant: "done" };
    if (plan)                        return { text: s.chip.reviewAndApprove, variant: "action" };
    if (hasJd)                       return { text: s.chip.jdReadyCreate, variant: "ready" };
    return                                  { text: s.chip.enterJdToStart, variant: "idle" };
  })();

  return (
    <section
      className="px-1 py-1.5"
      aria-label={s.aria.progress}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Stepper */}
        <ol className="flex flex-1 items-center min-w-0 select-none" aria-label={s.aria.steps}>
          {STEPS.map((step, idx) => {
            const done         = isStepDone(step.id, hasJd, plan, questionCount);
            const isActive     = step.id === current && !done;
            const isPending    = !done && !isActive;
            const isProcessing = isBusy && (
              ((isStreaming || isApplying) && step.id === "plan") ||
              (isGenerating && step.id === "generate")
            );

            const connectorDelay = `-${((STEPS.length - 1 - idx) * 0.9).toFixed(1)}s`;

            return (
              <li key={step.id} className={cn("flex min-w-0 items-center", idx < STEPS.length - 1 && "flex-1")}>
                {/* Step node */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  {/* Circle */}
                  <div
                    className={cn(
                      "relative flex items-center justify-center rounded-full shrink-0 transition-all duration-300",
                      done
                        ? "w-7 h-7 hr-stepper-done text-white shadow-sm"
                        : isActive
                          ? "w-7 h-7 hr-stepper-active text-white ring-2 ring-[#7C3AED]/25 ring-offset-1 dark:ring-offset-gray-950 shadow-sm shadow-[#7C3AED]/20"
                          : "w-7 h-7 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {done ? (
                      <Check
                        className="h-3.5 w-3.5"
                        strokeWidth={3}
                        style={{ animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
                      />
                    ) : isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "hidden sm:block text-center whitespace-nowrap leading-tight transition-colors duration-200",
                      isActive
                        ? "text-[10px] font-semibold text-[#7C3AED] dark:text-[#a78bff]"
                        : done
                          ? "text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                          : "text-[10px] font-medium text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 flex-1 h-px transition-all duration-500 sm:mb-4.5",
                      done
                        ? "hr-stepper-connector-done"
                        : isActive
                          ? "bg-gray-300 dark:bg-gray-700"
                          : "bg-gray-300 dark:bg-gray-800"
                    )}
                    style={done ? ({ "--connector-delay": connectorDelay } as React.CSSProperties) : undefined}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Status chip */}
        <div
          key={chipInfo.variant + chipInfo.text}
          style={{ animation: "scaleInFade 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
          className={cn(
            "hidden xs:flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap border",
            chipInfo.variant === "busy"   && "bg-violet-50  text-violet-700  border-violet-100  dark:bg-violet-950/30  dark:text-violet-300  dark:border-violet-900/40",
            chipInfo.variant === "done"   && "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
            chipInfo.variant === "action" && "bg-amber-50   text-amber-700   border-amber-100   dark:bg-amber-950/30   dark:text-amber-300   dark:border-amber-900/40",
            chipInfo.variant === "ready"  && "bg-primary/8  text-primary     border-primary/15  dark:bg-primary/15    dark:text-primary     dark:border-primary/30",
            chipInfo.variant === "idle"   && "bg-gray-50    text-gray-500    border-gray-100    dark:bg-gray-900/60   dark:text-gray-400   dark:border-gray-800",
          )}
          aria-live="polite"
        >
          {chipInfo.variant === "busy"
            ? <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
            : chipInfo.variant === "done"
              ? <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} />
              : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
          <span>{chipInfo.text}</span>
        </div>
      </div>
    </section>
  );
}
