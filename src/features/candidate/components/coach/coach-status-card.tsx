"use client";

import Link from "next/link";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export type CoachStatusKind = "idle" | "generating" | "ready" | "error";

interface CoachStatusCardProps {
  status: CoachStatusKind;
  purposeLabel: string;
  errorMessage?: string | null;
  onTake: () => void;
  onRetry: () => void;
}

export function CoachStatusCard({
  status,
  purposeLabel,
  errorMessage,
  onTake,
  onRetry,
}: CoachStatusCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  if (status === "generating") {
    return (
      <div className="hr-glass-card p-5 space-y-2">
        <p className={cn("text-[14px] font-semibold inline-flex items-center gap-2", portalHeadingAlt)}>
          <Loader2 size={16} className="animate-spin text-primary" />
          {p.generatingBackground}
          <span className="inline-flex gap-0.5 ml-1" aria-hidden>
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]" />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.1s]" />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
          </span>
        </p>
        <p className={cn("text-[12px]", portalSubtextAlt)}>{purposeLabel}</p>
        <p className={cn("text-[13px]", portalSubtextAlt)}>{p.pollingStay}</p>
        <Link href="/jobseeker/practice" className="text-[12px] text-primary font-semibold hover:underline">
          {p.browseWhileWaiting}
        </Link>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="rounded-[14px] border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/25 p-5 space-y-2">
        <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.readyBadge}</p>
        <p className={cn("text-[12px]", portalSubtextAlt)}>{purposeLabel}</p>
        <p className={cn("text-[13px]", portalSubtextAlt)}>{p.takeDiagnosticHint}</p>
        <button
          type="button"
          onClick={onTake}
          className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-white mt-1"
        >
          {p.takeDiagnostic}
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-[14px] border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/20 p-5 space-y-2">
        <p className="text-[14px] font-semibold text-red-700 dark:text-red-300 inline-flex items-center gap-2">
          <AlertCircle size={16} />
          {p.errorTitle}
        </p>
        <p className="text-[13px] text-red-600/90 dark:text-red-400">{errorMessage || p.generateFailed}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12px] font-semibold border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 mt-1"
        >
          {p.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="hr-glass-card p-5 space-y-2">
      <p className={cn("text-[14px] font-semibold inline-flex items-center gap-2", portalHeadingAlt)}>
        <Sparkles size={16} className="text-primary" />
        {p.idleTitle}
      </p>
      <p className={cn("text-[13px]", portalSubtextAlt)}>{p.idleBody}</p>
    </div>
  );
}
