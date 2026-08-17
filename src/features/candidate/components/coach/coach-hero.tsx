"use client";

import Link from "next/link";
import { Bot, Crown, Loader2, Sparkles, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

interface CoachHeroProps {
  isPremium: boolean;
  busy: boolean;
  hasPlan: boolean;
  diagnosticDisabled: boolean;
  onPrimary: () => void;
  onUpgrade: () => void;
}

export function CoachHero({
  isPremium,
  busy,
  hasPlan,
  diagnosticDisabled,
  onPrimary,
  onUpgrade,
}: CoachHeroProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const ctaLabel = !isPremium
    ? p.upgradeCta
    : busy
      ? p.generating
      : hasPlan
        ? p.reDiagnostic
        : p.startDiagnostic;

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="hr-quick-generate p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-900/70 border border-primary/15 flex items-center justify-center shrink-0">
            <Bot size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-[800] leading-[32px] gradient-text-animate">{p.title}</h1>
              {isPremium && (
                <span className="inline-flex items-center gap-1 text-[10px] font-[700] uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                  <Crown size={10} />
                  {p.planBadgePremium}
                </span>
              )}
            </div>
            <p className={cn("text-[13px] leading-[19px] mt-1.5 max-w-xl", portalSubtextAlt)}>{p.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isPremium && (busy || diagnosticDisabled)}
            onClick={() => (isPremium ? onPrimary() : onUpgrade())}
            className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {isPremium && busy ? <Loader2 size={14} className="animate-spin" /> : isPremium ? <Sparkles size={14} /> : <Crown size={14} />}
            {ctaLabel}
          </button>
          <Link
            href="/jobseeker/practice"
            className={cn(
              "inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[13px] font-semibold border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-colors",
              portalHeadingAlt
            )}
          >
            <Store size={14} />
            {p.marketplaceCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
