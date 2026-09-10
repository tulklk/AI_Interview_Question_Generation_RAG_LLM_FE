"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";
import type { IntegrityStrike } from "@/features/candidate/anti-cheat/types";
import { MAX_INTEGRITY_STRIKES } from "@/features/candidate/anti-cheat/constants";
import { integrityEventDescription } from "@/features/candidate/anti-cheat/integrity-labels";
import { useLanguage } from "@/shared/providers/language-context";

type Props = {
  open: boolean;
  strike: IntegrityStrike | null;
  onAcknowledge: () => void;
};

/**
 * Single-ack integrity warning (strike 1 or 2). Blocks interaction until acknowledged.
 */
export function IntegrityWarningModal({ open, strike, onAcknowledge }: Props) {
  const { t } = useLanguage();
  const a = t.antiCheat;
  const { mounted, exiting } = useOverlayTransition(open && Boolean(strike), 250);
  const [latched, setLatched] = useState<IntegrityStrike | null>(strike);

  useEffect(() => {
    if (open && strike) setLatched(strike);
  }, [open, strike]);

  if (!mounted || !latched) return null;

  const isFinal = latched.strikeNumber >= MAX_INTEGRITY_STRIKES - 1;
  const warningOf = Math.min(latched.strikeNumber, MAX_INTEGRITY_STRIKES - 1);
  const maxWarnings = MAX_INTEGRITY_STRIKES - 1;
  const title = isFinal ? a.warningTitleFinal : a.warningTitle;
  const description = integrityEventDescription(latched.eventType, a.events);
  const ackLabel = isFinal ? a.ackContinue : a.ackUnderstand;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm",
          exiting ? "animate-fade-out" : "animate-fade-in"
        )}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="integrity-warning-title"
        aria-describedby="integrity-warning-desc"
        className={cn(
          "relative w-full max-w-md rounded-xl border border-amber-200 dark:border-amber-900/60",
          "bg-white dark:bg-gray-900 shadow-xl",
          exiting ? "animate-scale-out" : "animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                isFinal
                  ? "bg-red-50 dark:bg-red-950/50"
                  : "bg-amber-50 dark:bg-amber-950/50"
              )}
            >
              <AlertTriangle
                size={16}
                className={
                  isFinal
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }
              />
            </div>
            <h3
              id="integrity-warning-title"
              className="text-[15px] font-bold text-charcoal dark:text-gray-100"
            >
              {title}
            </h3>
          </div>

          <p className="text-center text-[13px] text-[#6b7280] dark:text-gray-400 leading-relaxed">
            {isFinal ? a.warningIntroFinal : a.warningIntro}
          </p>

          <p
            id="integrity-warning-desc"
            className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-center text-[13px] font-medium text-amber-900 dark:text-amber-200"
          >
            {description}
          </p>

          <p className="mt-3 text-center text-[12px] font-semibold text-amber-700 dark:text-amber-300">
            {a.warningOf
              .replace("{{n}}", String(warningOf))
              .replace("{{max}}", String(maxWarnings))}
          </p>
          <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#6b7280] dark:text-gray-400">
            {isFinal ? a.warningFinalHint : a.warningContinueHint}
          </p>
        </div>

        <div className="border-t border-border dark:border-gray-700 px-5 py-3">
          <button
            type="button"
            onClick={onAcknowledge}
            className={cn(
              "inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2",
              "text-sm font-semibold text-white shadow-sm transition-colors",
              isFinal
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary-hover"
            )}
          >
            {ackLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
