"use client";

import { Zap, Download } from "lucide-react";
import { billingHistory, usageStats } from "@/data/settings";
import { getUsageCaps } from "@/data/hr-subscription";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { HrBillingSubscription } from "./hr-billing-subscription";

export function BillingSection() {
  const { t } = useLanguage();
  const bill = t.settingsPage.billing;
  const usageLabels = bill.usageStatLabels;
  const { planId } = useHrSubscription();
  const caps = getUsageCaps(planId);

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{bill.title}</h3>

      <div className="mb-8">
        <HrBillingSubscription />
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <p className="text-sm font-semibold text-gray-700">{bill.monthlyUsage}</p>
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
                    <span className="text-xs text-gray-600">{label}</span>
                    <span className="text-xs font-medium text-gray-400">{bill.usageNotOnPlan}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden" />
                </div>
              );
            }
            const pct = Math.min(100, (stat.current / max) * 100);
            return (
              <div key={stat.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span className="text-xs font-medium text-gray-700">
                    {stat.current} / {max}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#6c47ff] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">{bill.billingHistory}</p>
        <div className="space-y-2">
          {billingHistory.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{record.date}</p>
                <p className="text-xs text-gray-400">{record.invoiceNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">{record.amount}</span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
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
