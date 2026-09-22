"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

interface CoachHeroProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onNewRun?: () => void;
  showNewRun?: boolean;
  newRunBusy?: boolean;
}

export function CoachHero({ isPremium, onUpgrade, onNewRun, showNewRun, newRunBusy }: CoachHeroProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-gray-200/80 dark:border-gray-800 bg-gradient-to-br from-white via-violet-50/40 to-sky-50/50 dark:from-gray-950 dark:via-violet-950/20 dark:to-gray-900 px-5 sm:px-7 py-6">
      <div className="relative z-[1] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide mb-2">
            <Sparkles size={12} />
            AI Coach
          </div>
          <h1 className={cn("text-[22px] sm:text-[26px] font-bold tracking-tight", portalHeadingAlt)}>
            {p.title}
          </h1>
          <p className={cn("mt-1.5 text-[13px] max-w-xl leading-relaxed", portalSubtextAlt)}>
            {p.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {showNewRun && onNewRun && (
            <button
              type="button"
              onClick={onNewRun}
              disabled={newRunBusy}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12px] font-semibold border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-60"
            >
              {p.newCoachRun}
            </button>
          )}
          {!isPremium && (
            <button
              type="button"
              onClick={onUpgrade}
              className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12px] font-semibold text-white"
            >
              {p.upgradeCta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
