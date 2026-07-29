"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock, Globe, GlobeLock, Loader2, Save, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { PlanDetail } from "@/features/studio/types/studio.types";

interface StudioActionBarProps {
  hasJd: boolean;
  plan: PlanDetail | null;
  questionCount: number;
  isStreaming: boolean;
  isGeneratingQuestions: boolean;
  canCreatePlan: boolean;
  canGenerate: boolean;
  skillCount?: number;
  isPublished?: boolean;
  onCreatePlan: () => void;
  onApprovePlan: () => void;
  onGenerateQuestions: () => void;
  onSaveDraft: () => void;
  onTogglePublish: () => void;
}

export function StudioActionBar({
  hasJd,
  plan,
  questionCount,
  isStreaming,
  isGeneratingQuestions,
  canCreatePlan,
  canGenerate,
  skillCount = 0,
  isPublished = false,
  onCreatePlan,
  onApprovePlan,
  onGenerateQuestions,
  onSaveDraft,
  onTogglePublish,
}: StudioActionBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { t } = useLanguage();
  const s = t.studioPage;

  const planApproved = plan?.status === "Approved";
  const hasQuestions = questionCount > 0;
  const isBusy = isStreaming || isGeneratingQuestions;

  const statusLabel = hasQuestions
    ? s.status.questionsGenerated.replace("{{count}}", String(questionCount))
    : isGeneratingQuestions
      ? s.status.generatingQuestions
      : planApproved
        ? s.status.planApproved
        : isStreaming
          ? s.status.creatingPlan
          : plan
            ? s.status.planPending
            : hasJd
              ? s.status.jdReady
              : s.status.enterJd;

  const statsLabel: string | null = hasQuestions
    ? `Rev ${plan?.revision ?? 1} · ${plan?.totalQuestions ?? questionCount} ${s.settings.unitQuestions}`
    : planApproved
      ? `${plan?.totalQuestions} ${s.settings.unitQuestions} · ${plan?.interviewLengthMinutes} ${s.settings.unitMin}`
      : plan
        ? `${plan.totalQuestions} ${s.settings.unitQuestions} · ${plan.interviewLengthMinutes} ${s.settings.unitMin} · ${plan.difficulty}`
        : hasJd && skillCount > 0
          ? s.status.skillsDetected.replace("{{count}}", String(skillCount))
          : hasJd
            ? s.status.readyToCreate
            : null;

  const statusDot =
    hasQuestions || planApproved
      ? "bg-emerald-500 dark:bg-emerald-400"
      : isBusy
        ? "animate-pulse bg-amber-500"
        : hasJd
          ? "bg-primary"
          : "bg-gray-300 dark:bg-gray-600";

  type Cta = { label: string; action?: () => void; disabled?: boolean };
  let cta: Cta;

  if (hasQuestions) {
    cta = { label: s.cta.completed, disabled: true };
  } else if (isGeneratingQuestions) {
    cta = { label: s.cta.generating, disabled: true };
  } else if (planApproved) {
    cta = { label: s.cta.generateQuestions, action: onGenerateQuestions, disabled: !canGenerate };
  } else if (isStreaming) {
    cta = { label: s.cta.processing, disabled: true };
  } else if (plan) {
    cta = { label: s.cta.approvePlan, action: onApprovePlan };
  } else {
    cta = { label: s.cta.createPlan, action: onCreatePlan, disabled: !canCreatePlan };
  }

  const bar = (
    <div
      role="region"
      aria-label={s.aria.actionBar}
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95 lg:left-62.5"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full transition-colors", statusDot)} aria-hidden />
          <p className="truncate text-xs text-gray-700 dark:text-gray-200">
            <span className="font-semibold text-gray-900 dark:text-gray-50">{statusLabel}</span>
            {statsLabel && (
              <span className="text-gray-400 dark:text-gray-500"> · {statsLabel}</span>
            )}
          </p>
        </div>

        {plan && !hasQuestions && (
          <div className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 dark:bg-gray-800/60 sm:flex">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{plan.interviewLengthMinutes} {s.settings.unitMin}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isBusy}
          onClick={onSaveDraft}
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
            "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
            "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors sm:inline-flex"
          )}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{s.save}</span>
        </button>

        {/* Publish toggle — only when questions are ready */}
        {hasQuestions && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onTogglePublish}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isPublished
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary/50 dark:hover:text-primary"
            )}
          >
            {isPublished
              ? <><CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{s.published}</span></>
              : <><Globe className="h-3.5 w-3.5" /><span className="hidden sm:inline">{s.publish}</span></>
            }
          </button>
        )}

        <button
          type="button"
          disabled={cta.disabled || !cta.action}
          onClick={cta.action}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white",
            "bg-linear-to-r from-primary to-[#5535dd] shadow-sm shadow-primary/20",
            "hover:from-[#5a3aef] hover:to-[#4a28c9]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
            "transition-all duration-150"
          )}
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {cta.label}
        </button>
      </div>
    </div>
  );

  // Portal to document.body bypasses any ancestor CSS transforms (e.g. animate-fade-up)
  // that would otherwise break fixed positioning.
  return mounted ? createPortal(bar, document.body) : null;
}
