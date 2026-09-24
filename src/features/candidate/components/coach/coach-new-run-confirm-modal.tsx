"use client";

import { createPortal } from "react-dom";
import { Loader2, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import {
  overlayBackdropVariants,
  overlayPanelVariants,
} from "@/features/candidate/components/coach/coach-motion";

interface CoachNewRunConfirmModalProps {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function CoachNewRunConfirmModal({
  open,
  busy = false,
  onConfirm,
  onClose,
}: CoachNewRunConfirmModalProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="coach-new-run-confirm"
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          initial={reduced ? false : "hidden"}
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden
            variants={overlayBackdropVariants}
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={() => {
              if (!busy) onClose();
            }}
          />
          <motion.div
            role="alertdialog"
            aria-modal
            aria-labelledby="coach-new-run-title"
            aria-describedby="coach-new-run-desc"
            className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            variants={overlayPanelVariants}
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles size={15} className="text-primary" />
                </div>
                <p
                  id="coach-new-run-title"
                  className={cn("text-[15px] font-semibold", portalHeadingAlt)}
                >
                  {p.newCoachRunConfirmTitle}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                aria-label={p.nextLevelConfirmNo}
              >
                <X size={16} />
              </button>
            </div>

            <p id="coach-new-run-desc" className={cn("text-[13px] leading-relaxed", portalSubtextAlt)}>
              {p.newCoachRunConfirm}
            </p>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-3.5 text-[12px] font-semibold disabled:opacity-50 dark:border-gray-700"
              >
                {p.nextLevelConfirmNo}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="hr-cta-btn inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {p.newCoachRunConfirmYes}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
