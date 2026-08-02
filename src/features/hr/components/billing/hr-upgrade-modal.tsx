"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, Check, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { HrPlanId } from "@/features/hr/types/hr-subscription";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { listSubscriptionPlans, type SubscriptionPlan } from "@/features/subscription/services/subscription.service";

interface Props {
  onClose: () => void;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currency || "VND", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

export function HrUpgradeModal({ onClose }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const sub = t.settingsPage.subscription;
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const planCardRows = sub.planCardRows as Record<HrPlanId, { text: string; included: boolean }[]>;
  const rows = (planCardRows.HR_PREMIUM ?? []).filter((r) => r.included);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    void listSubscriptionPlans("HR")
      .then((plans) => setPlan(plans.find((p) => p.code === "HR_PREMIUM") ?? null))
      .finally(() => setLoading(false));
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function goToBilling() {
    onClose();
    router.push(`/hr/settings?tab=billing`);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
              <Zap size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className={cn("text-[15px] font-bold leading-tight", portalHeading)}>
                {sub.sectionTitle}
              </h2>
              <p className={cn("text-[11px] mt-0.5", portalSubtext)}>{sub.sectionSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative flex flex-col rounded-xl border border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/40 dark:bg-violet-950/20 p-4 gap-3">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide text-white bg-violet-600 px-3 py-0.5 rounded-full shadow-sm whitespace-nowrap">
              {sub.popular}
            </span>

            <div className="pt-3">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", portalSubtext)}>
                {sub.planNames.HR_PREMIUM}
              </p>
              <div className="flex items-baseline gap-1">
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-violet-500" />
                ) : (
                  <span className={cn("text-2xl font-bold", portalHeading)}>
                    {plan ? formatMoney(plan.priceMonthly, plan.currency) : sub.priceCustom}
                  </span>
                )}
                {plan && <span className={cn("text-xs", portalSubtext)}>{t.settingsPage.billing.perMonth}</span>}
              </div>
              <p className={cn("text-[11px] mt-1 leading-snug", portalSubtext)}>{sub.planSub.HR_PREMIUM}</p>
            </div>

            <ul className="flex flex-col gap-1.5 flex-1">
              {rows.map((row, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                  <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className={cn("leading-snug", portalHeading)}>{row.text}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={goToBilling}
              className="mt-auto w-full text-[12px] font-semibold py-2 rounded-lg transition-colors bg-violet-600 text-white hover:bg-violet-700"
            >
              {sub.planCta.HR_PREMIUM}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
