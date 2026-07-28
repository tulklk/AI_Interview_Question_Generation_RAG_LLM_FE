"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { GenerationRun, PlanDetail } from "@/features/studio/types/studio.types";

export type StudioFlowStepId = "jd" | "plan" | "approve" | "generate";

const STEPS: { id: StudioFlowStepId; label: string }[] = [
  { id: "jd",       label: "Nguồn dữ liệu" },
  { id: "plan",     label: "Kế hoạch" },
  { id: "approve",  label: "Duyệt" },
  { id: "generate", label: "Sinh câu hỏi" },
];

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
  const current = resolveStudioFlowStep({ hasJd, plan, questionCount });
  const isBusy = isStreaming || isApplying || isGenerating;

  const busyHint = isApplying
    ? "Đang áp dụng cài đặt…"
    : isStreaming
      ? "Đang tạo kế hoạch (RAG)…"
      : isGenerating
        ? generationRun?.requestedQuestionCount
          ? `Sinh câu hỏi ${Math.min(generationRun.generatedQuestionCount ?? 0, generationRun.requestedQuestionCount)}/${generationRun.requestedQuestionCount}`
          : "Đang sinh bộ câu hỏi…"
        : questionCount > 0
          ? `Hoàn tất — ${questionCount} câu hỏi`
          : null;

  return (
    <section
      className="px-2 py-2"
      aria-label="Tiến trình Studio"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Stepper — same markup pattern as FlowStepIndicator in generate-form.tsx */}
        <ol className="flex w-full flex-1 items-center select-none" aria-label="Các bước">
          {STEPS.map((step, idx) => {
            const done    = isStepDone(step.id, hasJd, plan, questionCount);
            const isActive = step.id === current && !done;

            const isProcessingHere =
              isBusy &&
              (((isStreaming || isApplying) && step.id === "plan") ||
               (isGenerating && step.id === "generate"));

            const prevDone = idx > 0
              ? isStepDone(STEPS[idx - 1].id, hasJd, plan, questionCount)
              : true;

            // Cascade shimmer delay (same formula as generate-form.tsx)
            const connectorDelay =
              idx === 0
                ? "0s"
                : `-${((STEPS.length - 1 - idx) * 0.9).toFixed(1)}s`;

            return (
              <li key={step.id} className={cn("flex min-w-0 items-center", idx < STEPS.length - 1 && "flex-1")}>
                {/* Step node */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-all duration-300",
                      done
                        ? "hr-stepper-done text-white"
                        : isActive
                          ? "hr-stepper-active text-white"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }} />
                    ) : isProcessingHere ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-center text-[10px] font-medium leading-tight whitespace-nowrap sm:block sm:text-[11px]",
                      isActive ? "text-[#7C3AED] dark:text-[#a78bff]"
                        : done  ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector after this step (skip last) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 transition-all duration-300 sm:mb-4",
                      done
                        ? "hr-stepper-connector-done"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}
                    style={done ? ({ "--connector-delay": connectorDelay } as React.CSSProperties) : undefined}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Busy / done hint chip */}
        {busyHint && (
          <div
            style={{ animation: "scaleInFade 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
              isBusy
                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
            )}
            aria-live="polite"
          >
            {isBusy
              ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              : <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
            <span className="max-w-44 truncate">{busyHint}</span>
          </div>
        )}
      </div>
    </section>
  );
}
