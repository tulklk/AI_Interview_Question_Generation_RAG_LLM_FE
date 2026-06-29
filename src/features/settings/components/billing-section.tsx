"use client";

import { Zap, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { billingHistory, usageStats } from "@/features/settings/data/settings";
import { getUsageCaps } from "@/features/hr/data/hr-subscription";
import { useLanguage } from "@/shared/providers/language-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { HrBillingSubscription } from "./hr-billing-subscription";
import { portalHeading, portalIconWell, portalMutedBg, portalSubtext } from "@/shared/utils/portal-ui";

export function BillingSection() {
  const { t } = useLanguage();
  const bill = t.settingsPage.billing;
  const usageLabels = bill.usageStatLabels;
  const { planId } = useHrSubscription();
  const caps = getUsageCaps(planId);

  return (
    <div>
      <h3 className={cn("text-base font-semibold mb-5", portalHeading)}>{bill.title}</h3>

      <div className="mb-8">
        <HrBillingSubscription />
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <p className={cn("text-sm font-semibold", portalHeading)}>{bill.monthlyUsage}</p>
        </div>
        <div className="space-y-3">
          {usageStats.map((stat) => {
            const max = caps[stat.id] ?? stat.max;
            const label =
              usageLabels[stat.id as keyof typeof usageLabels] ?? stat.label;
            if (max <= 0) {
              return (
                <div key={stat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs", portalSubtext)}>{label}</span>
                    <span className={cn("text-xs font-medium", portalSubtext)}>{bill.usageNotOnPlan}</span>
                  </div>
                  <div className={cn("h-2 rounded-full overflow-hidden", portalMutedBg)} />
                </div>
              );
            }
            const pct = Math.min(100, (stat.current / max) * 100);
            return (
              <div key={stat.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-xs", portalSubtext)}>{label}</span>
                  <span className={cn("text-xs font-medium", portalHeading)}>
                    {stat.current} / {max}
                  </span>
                </div>
                <div className={cn("h-2 rounded-full overflow-hidden", portalMutedBg)}>
                  <div className="h-full bg-[#6c47ff] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className={cn("text-sm font-semibold mb-3", portalHeading)}>{bill.billingHistory}</p>
        <div className="space-y-2">
          {billingHistory.map((record) => (
            <div
              key={record.id}
              className={cn("flex items-center justify-between rounded-lg px-4 py-3", portalIconWell)}
            >
              <div>
                <p className={cn("text-sm font-medium", portalHeading)}>{record.date}</p>
                <p className={cn("text-xs", portalSubtext)}>{record.invoiceNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-semibold", portalHeading)}>{record.amount}</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  {bill.paid}
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-[#6c47ff] hover:underline flex items-center gap-1"
                >
                  <Download size={11} />
                  {bill.download}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
