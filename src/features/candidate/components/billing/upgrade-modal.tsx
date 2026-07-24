"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getCandidateSubscription,
  getCandidateBillingUsage,
  getCandidatePaymentHistory,
  upgradeToPremium,
} from "@/features/candidate/services/candidate-billing.service";
import type {
  CandidateSubscription,
  CandidateBillingUsage,
  PaymentHistoryItem,
} from "@/features/candidate/types/billing";

export interface UpgradeModalDonePayload {
  subscription: CandidateSubscription;
  usage: CandidateBillingUsage;
  history: PaymentHistoryItem[];
}

interface UpgradeModalProps {
  onClose: () => void;
  onDone?: (payload: UpgradeModalDonePayload) => void;
}

export function UpgradeModal({ onClose, onDone }: UpgradeModalProps) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const b = t.jobseekerSettingsPage.billing;
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleConfirm() {
    setLoading(true);
    try {
      await upgradeToPremium({ billingCycle: cycle });
      const [sub, use, hist] = await Promise.all([
        getCandidateSubscription(),
        getCandidateBillingUsage(),
        getCandidatePaymentHistory(),
      ]);
      addToast("success", b.upgradeSuccess);
      onDone?.({ subscription: sub, usage: use, history: hist });
      onClose();
    } catch {
      addToast("error", b.upgradeFailed);
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown size={18} className="text-primary" />
            </div>
            <h2 className={cn("text-[17px] font-bold", portalHeading)}>{b.upgradeModalTitle}</h2>
          </div>
          <p className={cn("text-sm", portalSubtext)}>{b.upgradeModalDesc}</p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Billing cycle selector */}
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2.5", portalSubtext)}>
              {b.billingCycleLabel}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {(["MONTHLY", "YEARLY"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={cn(
                    "relative flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                    cycle === c
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <span className={cn("text-sm font-semibold", cycle === c ? "text-primary" : portalHeading)}>
                    {c === "MONTHLY" ? b.monthly : b.yearly}
                  </span>
                  <span className={cn("text-lg font-extrabold mt-0.5", cycle === c ? "text-primary" : portalHeading)}>
                    {c === "MONTHLY" ? "$12.99" : "$99"}
                  </span>
                  <span className={cn("text-[11px] mt-0.5", portalSubtext)}>
                    {c === "MONTHLY" ? b.perMonth : b.perYear}
                  </span>
                  {c === "YEARLY" && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                      {b.saveYearly}
                    </span>
                  )}
                  {cycle === c && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check size={9} className="text-white stroke-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-2">
            {b.premiumFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check size={13} className="text-primary shrink-0" />
                <span className={cn("text-sm", portalHeading)}>{f}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                "flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50",
                portalHeading
              )}
            >
              {b.cancelBtn.replace("Plan", "").trim() || "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 h-10 shimmer-button rounded-xl text-sm font-semibold text-white hr-cta-btn flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {b.upgradingLabel}
                </>
              ) : (
                b.upgradeConfirmBtn
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return modal;
}
