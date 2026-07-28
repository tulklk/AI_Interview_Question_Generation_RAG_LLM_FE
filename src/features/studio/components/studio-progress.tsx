"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { GenerationRun, PlanDetail } from "@/features/studio/types/studio.types";

export type StudioFlowStepId = "jd" | "plan" | "approve" | "generate";

const STEPS: { id: StudioFlowStepId; label: string; hint: string }[] = [
  { id: "jd", label: "JD", hint: "Nhập Job Description ở cột Sources" },
  { id: "plan", label: "Lập plan", hint: "Bấm Lập plan rồi chat / Áp dụng settings nếu cần" },
  { id: "approve", label: "Duyệt", hint: "Xem plan rồi bấm Approve" },
  { id: "generate", label: "Sinh câu hỏi", hint: "Bấm Sinh câu hỏi để tạo bộ câu hỏi" },
];

function isStepDone(
  id: StudioFlowStepId,
  hasJd: boolean,
  plan: PlanDetail | null,
  questionCount: number
): boolean {
  switch (id) {
    case "jd":
      return hasJd;
    case "plan":
      return Boolean(plan);
    case "approve":
      return plan?.status === "Approved";
    case "generate":
      return questionCount > 0;
    default:
      return false;
  }
}

export function resolveStudioFlowStep(input: {
  hasJd: boolean;
  plan: PlanDetail | null;
  questionCount: number;
}): StudioFlowStepId {
  const { hasJd, plan, questionCount } = input;
  if (!hasJd) return "jd";
  if (!plan) return "plan";
  if (plan.status !== "Approved") return "approve";
  if (questionCount <= 0) return "generate";
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
  const completedCount = STEPS.filter((s) => isStepDone(s.id, hasJd, plan, questionCount)).length;
  const overallPct = Math.round((completedCount / STEPS.length) * 100);

  const genRequested = generationRun?.requestedQuestionCount ?? 0;
  const genDone = generationRun?.generatedQuestionCount ?? questionCount;
  const genPct =
    isGenerating && genRequested > 0
      ? Math.min(95, Math.max(8, Math.round((genDone / genRequested) * 100)))
      : isGenerating
        ? 40
        : null;

  const busyHint = isApplying
    ? "Đang áp dụng settings vào plan…"
    : isStreaming
      ? "Đang xử lý plan (RAG)…"
      : isGenerating
        ? genRequested > 0
          ? `Đang sinh câu hỏi… ${Math.min(genDone, genRequested)}/${genRequested}`
          : "Đang sinh câu hỏi bằng RAG…"
        : questionCount > 0 && plan?.status === "Approved"
          ? `Hoàn tất — ${questionCount} câu hỏi sẵn sàng`
          : STEPS.find((s) => s.id === current)?.hint ?? "";

  const displayPct = genPct ?? overallPct;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#e8e4f8] bg-white px-4 py-3 shadow-sm",
        "dark:border-gray-800 dark:bg-gray-900"
      )}
      aria-label="Tiến trình tạo bộ câu hỏi"
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Tiến trình</p>
        <p className="max-w-[70%] truncate text-right text-[11px] text-gray-500 dark:text-gray-400">
          {busyHint}
        </p>
      </div>

      <ol className="mb-3 flex items-start justify-between gap-1">
        {STEPS.map((step, idx) => {
          const done = isStepDone(step.id, hasJd, plan, questionCount);
          const active = step.id === current && !(done && step.id !== "generate");
          // Bước cuối: active khi approved chưa có câu hỏi hoặc đang generate; done khi đã có câu hỏi
          const isActive =
            step.id === "generate"
              ? plan?.status === "Approved" && (questionCount === 0 || isGenerating)
              : active && !done;
          const showCheck = done && !(step.id === "generate" && isGenerating);

          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {idx > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      isStepDone(STEPS[idx - 1].id, hasJd, plan, questionCount)
                        ? "bg-[#6c47ff]"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                    showCheck && "bg-[#6c47ff] text-white",
                    isActive && !showCheck && "bg-[#6c47ff]/15 text-[#6c47ff] ring-2 ring-[#6c47ff]",
                    !showCheck && !isActive && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {showCheck ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      done ? "bg-[#6c47ff]" : "bg-gray-200 dark:bg-gray-700"
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={cn(
                  "max-w-full truncate text-center text-[10px] font-medium sm:text-[11px]",
                  isActive || showCheck ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayPct}
        aria-label="Phần trăm hoàn thành"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isGenerating || isStreaming || isApplying
              ? "animate-pulse bg-gradient-to-r from-[#6c47ff] via-[#a78bfa] to-[#6c47ff]"
              : "bg-gradient-to-r from-[#6c47ff] to-[#8b6cff]"
          )}
          style={{ width: `${displayPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
        <span>
          Bước {Math.min(Math.max(completedCount, 1), STEPS.length)}/{STEPS.length}
          {isGenerating ? " · Đang sinh" : isStreaming ? " · Đang xử lý" : isApplying ? " · Đang áp dụng" : ""}
        </span>
        <span>{displayPct}%</span>
      </div>
    </section>
  );
}
