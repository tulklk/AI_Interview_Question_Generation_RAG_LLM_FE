"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalMutedBg,
  portalBanner,
  portalDivider,
} from "@/shared/utils/portal-ui";
import type { PlanDraft } from "@/features/interview/types/generation-session";

interface PlanReviewCardProps {
  plan: PlanDraft;
  onConfirm: () => void;
  onBack: () => void;
}

export function PlanReviewCard({ plan, onConfirm, onBack }: PlanReviewCardProps) {
  const { t } = useLanguage();
  const pr = t.generationSessionPage.planReview;
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className={cn(portalCard, "shadow-sm p-6 space-y-5")}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>{pr.heading}</h3>
          <p className={cn("text-sm", portalSubtext)}>{pr.subtext}</p>
        </div>
      </div>

      {/* Plan Details Grid */}
      <div className={cn("rounded-xl border p-4 space-y-4", portalBanner)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <PlanItem label={pr.role} value={plan.role} />
          <PlanItem label={pr.level} value={plan.level} />
          <PlanItem label={pr.questionCount} value={String(plan.questionCount)} />
        </div>

        <div className={cn("border-t pt-4", portalDivider)}>
          <p className={cn("text-xs font-semibold mb-2", portalHeading)}>{pr.questionTypes}</p>
          <div className="flex flex-wrap gap-2">
            {plan.questionTypes.map((qt) => (
              <span
                key={qt}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#6c47ff]/10 text-[#6c47ff]"
              >
                {qt}
              </span>
            ))}
          </div>
        </div>

        <div className={cn("border-t pt-4", portalDivider)}>
          <p className={cn("text-xs font-semibold mb-2", portalHeading)}>{pr.topics}</p>
          <div className="flex flex-wrap gap-2">
            {plan.topics.map((topic) => (
              <span
                key={topic}
                className={cn("text-xs px-2.5 py-1 rounded-md", portalMutedBg, portalSubtext)}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {plan.constraints && (
          <div className={cn("border-t pt-4", portalDivider)}>
            <p className={cn("text-xs font-semibold mb-1", portalHeading)}>{pr.constraints}</p>
            <p className={cn("text-sm", portalSubtext)}>{plan.constraints}</p>
          </div>
        )}

        {plan.summary && (
          <div className={cn("border-t pt-4", portalDivider)}>
            <p className={cn("text-xs font-semibold mb-1", portalHeading)}>{pr.summary}</p>
            <p className={cn("text-sm leading-relaxed", portalSubtext)}>{plan.summary}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={confirming}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors",
            portalCard,
            portalHeading,
            "hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          )}
        >
          <ArrowLeft size={14} />
          {pr.backBtn}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#6c47ff] text-white hover:bg-[#5535dd] transition-colors disabled:opacity-70"
        >
          {confirming ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {pr.confirming}
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              {pr.confirmBtn}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PlanItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={cn("text-xs font-semibold mb-0.5 uppercase tracking-wide", portalSubtext)}>
        {label}
      </p>
      <p className={cn("text-sm font-semibold", portalHeading)}>{value}</p>
    </div>
  );
}
