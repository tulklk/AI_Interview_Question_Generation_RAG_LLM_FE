"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { PlanDetail } from "@/features/studio/types/studio.types";
interface StudioActionBarProps {
  hasJd: boolean;
  plan: PlanDetail | null;
  questionCount: number;
  /** Questions that have both sample answer + scoring rubric. */
  readyCount?: number;
  isStreaming: boolean;
  isGeneratingQuestions: boolean;
  canCreatePlan: boolean;
  canGenerate: boolean;
  skillCount?: number;
  isPublished?: boolean;
  questionSetId?: string | null;
  isSavingDraft?: boolean;
  isDraftSaved?: boolean;
  onCreatePlan: () => void;
  onApprovePlan: () => void;
  onGenerateQuestions: () => void;
  onSaveDraft: () => void;
  onTogglePublish: () => void;
  onPublishBlocked?: () => void;
  onCopyShareLink?: () => void;
}

export function StudioActionBar({
  hasJd,
  plan,
  questionCount,
  readyCount = 0,
  isStreaming,
  isGeneratingQuestions,
  canCreatePlan,
  canGenerate,
  skillCount = 0,
  isPublished = false,
  questionSetId = null,
  isSavingDraft = false,
  isDraftSaved = false,
  onCreatePlan,
  onApprovePlan,
  onGenerateQuestions,
  onSaveDraft,
  onTogglePublish,
  onPublishBlocked,
  onCopyShareLink,
}: StudioActionBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { t } = useLanguage();
  const s = t.studioPage;

  const planApproved = plan?.status === "Approved";
  const hasQuestions = questionCount > 0;
  const isBusy = isStreaming || isGeneratingQuestions;
  const allReady = hasQuestions && readyCount >= questionCount && questionCount > 0;
  const createdLabel = s.publishReadiness
    .replace("{{ready}}", String(questionCount))
    .replace("{{total}}", String(questionCount));

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
    isPublished
      ? "bg-emerald-500 dark:bg-emerald-400"
      : hasQuestions || planApproved
        ? "bg-emerald-500 dark:bg-emerald-400"
        : isBusy
          ? "animate-pulse bg-amber-500"
          : hasJd
            ? "bg-primary"
            : "bg-gray-300 dark:bg-gray-600";

  type Cta = { label: string; action?: () => void; disabled?: boolean };
  let preQuestionCta: Cta | null = null;

  if (!hasQuestions) {
    if (isGeneratingQuestions) {
      preQuestionCta = { label: s.cta.generating, disabled: true };
    } else if (planApproved) {
      preQuestionCta = { label: s.cta.generateQuestions, action: onGenerateQuestions, disabled: !canGenerate };
    } else if (isStreaming) {
      preQuestionCta = { label: s.cta.processing, disabled: true };
    } else if (plan) {
      preQuestionCta = { label: s.cta.approvePlan, action: onApprovePlan };
    } else {
      preQuestionCta = { label: s.cta.createPlan, action: onCreatePlan, disabled: !canCreatePlan };
    }
  }

  const handlePublishClick = () => {
    if (isPublished) {
      onTogglePublish();
      return;
    }
    if (!allReady) {
      onPublishBlocked?.();
      return;
    }
    onTogglePublish();
  };

  const historyHref = questionSetId ? `/hr/history/${questionSetId}` : "/hr/history";

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
            <span className="font-semibold text-gray-900 dark:text-gray-50">
              {isPublished ? s.published : statusLabel}
            </span>
            {isPublished ? (
              <span className="text-gray-400 dark:text-gray-500"> · {s.publishedReadyHint}</span>
            ) : statsLabel ? (
              <span className="text-gray-400 dark:text-gray-500"> · {statsLabel}</span>
            ) : null}
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
          disabled={isBusy || isSavingDraft || isDraftSaved}
          onClick={onSaveDraft}
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
            isDraftSaved
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 disabled:cursor-default dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : [
                  "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
                  "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ],
            "transition-colors sm:inline-flex"
          )}
        >
          {isSavingDraft ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isDraftSaved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span className="hidden lg:inline">
            {isSavingDraft ? s.saving : isDraftSaved ? s.saved : s.save}
          </span>
        </button>

        {hasQuestions && !isPublished && (
          <>
            <span
              className="hidden shrink-0 text-[11px] font-medium text-emerald-600 sm:inline dark:text-emerald-400"
              title={createdLabel}
            >
              {createdLabel}
            </span>

            <button
              type="button"
              disabled={isBusy}
              onClick={handlePublishClick}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150",
                "disabled:cursor-not-allowed disabled:opacity-50",
                allReady
                  ? "bg-linear-to-r from-primary to-[#5535dd] text-white shadow-sm shadow-primary/20 hover:from-[#5a3aef] hover:to-[#4a28c9]"
                  : "border border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
              )}
              title={
                allReady
                  ? s.publish
                  : s.publishBlockedToast
                      .replace("{{ready}}", String(readyCount))
                      .replace("{{total}}", String(questionCount))
              }
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.publish}</span>
            </button>

            {allReady && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                role="status"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.cta.completed}</span>
              </span>
            )}
          </>
        )}

        {hasQuestions && isPublished && (
          <>
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              role="status"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.published}</span>
            </span>

            <Link
              href={historyHref}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.viewQuestionSet}</span>
            </Link>

            {onCopyShareLink && (
              <button
                type="button"
                onClick={onCopyShareLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.copyShareLink}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={onTogglePublish}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.published}</span>
            </button>
          </>
        )}

        {preQuestionCta && (
          <button
            type="button"
            disabled={preQuestionCta.disabled || !preQuestionCta.action}
            onClick={preQuestionCta.action}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white",
              "bg-linear-to-r from-primary to-[#5535dd] shadow-sm shadow-primary/20",
              "hover:from-[#5a3aef] hover:to-[#4a28c9]",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              "transition-all duration-150"
            )}
          >
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {preQuestionCta.label}
          </button>
        )}
      </div>
    </div>
  );

  return mounted ? createPortal(bar, document.body) : null;
}
