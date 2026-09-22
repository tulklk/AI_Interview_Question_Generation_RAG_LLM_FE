"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export type CoachStatusKind = "idle" | "generating" | "ready" | "error";

interface CoachStatusCardProps {
  status: CoachStatusKind;
  purposeLabel: string;
  errorMessage?: string | null;
  /** system | inferred — warning khi suy luận thiếu KB */
  kbSource?: string | null;
  onTake: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  onStart?: () => void;
  cancelling?: boolean;
  startDisabled?: boolean;
}

export function CoachStatusCard({
  status,
  purposeLabel,
  errorMessage,
  kbSource,
  onTake,
  onRetry,
  onCancel,
  onStart,
  cancelling,
  startDisabled,
}: CoachStatusCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const inferred = (kbSource ?? "").toLowerCase() === "inferred";
  const systemKb = (kbSource ?? "").toLowerCase() === "system";

  if (status === "generating") {
    return (
      <div className="hr-glass-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <Loader2 size={14} className="animate-spin text-primary shrink-0" />
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
            {p.generatingBackground}
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            <span className="font-medium text-primary/80">{purposeLabel}</span>
          </p>
          <p className={cn("text-[12px]", portalSubtextAlt)}>{p.pollingStay}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {onCancel && (
              <button
                type="button"
                disabled={cancelling}
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-700 hover:border-red-300 text-red-600 disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                {p.cancelGeneration}
              </button>
            )}
            <Link
              href="/candidate/practice"
              className="text-[12px] text-primary font-semibold hover:underline self-center"
            >
              {p.browseWhileWaiting} →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="rounded-[14px] border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">
            {p.readyBadge}
          </p>
          {systemKb && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              {p.diagnosticKbSystemBadge}
            </span>
          )}
          {inferred && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {p.diagnosticKbInferredBadge}
            </span>
          )}
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            <span className="font-medium text-emerald-700 dark:text-emerald-300">{purposeLabel}</span>
          </p>
          {inferred && (
            <p className="text-[12px] text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2">
              {p.diagnosticKbInferred}
            </p>
          )}
          <p className={cn("text-[12px]", portalSubtextAlt)}>{p.takeDiagnosticHint}</p>
          <button
            type="button"
            onClick={onTake}
            className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold text-white mt-1 w-fit"
          >
            {p.takeDiagnostic}
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-[14px] border border-red-200 dark:border-red-800/60 bg-red-50/60 dark:bg-red-950/15 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-red-100 dark:border-red-900/50">
          <AlertCircle size={14} className="text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-[13px] font-semibold text-red-700 dark:text-red-300">{p.errorTitle}</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          <p className="text-[12px] text-red-600/90 dark:text-red-400">
            {errorMessage || p.generateFailed}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-0.5 w-fit"
          >
            {p.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <Sparkles size={14} className="text-charcoal dark:text-gray-100 shrink-0" />
        <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.idleTitle}</p>
      </div>
      <div className="px-5 py-4 flex flex-col gap-3">
        <p className={cn("text-[12px]", portalSubtextAlt)}>{p.idleBody}</p>
        {onStart && (
          <button
            type="button"
            disabled={startDisabled}
            onClick={onStart}
            className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold text-white w-fit disabled:opacity-50"
          >
            <Sparkles size={14} />
            {p.startDiagnostic}
          </button>
        )}
      </div>
    </div>
  );
}
