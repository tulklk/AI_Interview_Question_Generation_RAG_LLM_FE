"use client";

import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { coachTransition } from "@/features/candidate/components/coach/coach-motion";

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
  const reduced = useReducedMotion();

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950/80 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <motion.div
          className="min-w-0"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={coachTransition}
        >
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Sparkles size={11} />
            AI Coach
          </div>
          <h1 className={cn("text-xl font-bold tracking-tight sm:text-2xl", portalHeadingAlt)}>
            {p.title}
          </h1>
          <p className={cn("mt-1 max-w-xl text-[13px] leading-snug", portalSubtextAlt)}>
            {p.subtitle}
          </p>
        </motion.div>
        <motion.div
          className="flex shrink-0 flex-wrap gap-2"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...coachTransition, delay: reduced ? 0 : 0.08 }}
        >
          {showNewRun && onNewRun && (
            <button
              type="button"
              onClick={onNewRun}
              disabled={newRunBusy}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3.5 text-[12px] font-semibold text-gray-600 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
            >
              {p.newCoachRun}
            </button>
          )}
          {!isPremium && (
            <button
              type="button"
              onClick={onUpgrade}
              className="shimmer-button hr-cta-btn inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12px] font-semibold text-white"
            >
              {p.upgradeCta}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
