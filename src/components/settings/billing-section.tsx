"use client";

import { Check, Zap, Download } from "lucide-react";
import { billingHistory, usageStats } from "@/data/settings";
import { useLanguage } from "@/context/language-context";

export function BillingSection() {
  const { t } = useLanguage();
  const bill = t.settingsPage.billing;

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{bill.title}</h3>

      <div className="bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] rounded-xl p-5 mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-10 -translate-y-10" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-medium mb-0.5">{bill.currentPlan}</p>
              <p className="text-white text-2xl font-bold leading-none">{bill.planName}</p>
            </div>
            <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full">
              {bill.active}
            </span>
          </div>
          <p className="text-white text-xl font-bold mb-3">
            $49<span className="text-white/70 text-sm font-normal">{bill.perMonth}</span>
          </p>
          <ul className="space-y-1 mb-4">
            {bill.planFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-white/85 text-xs">
                <Check size={12} className="text-white shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button className="flex-1 bg-white text-[#6c47ff] text-sm font-semibold py-2 rounded-lg hover:bg-white/90 transition-colors">
              {bill.upgradeBtn}
            </button>
            <button className="flex-1 bg-white/20 text-white text-sm font-semibold py-2 rounded-lg hover:bg-white/30 transition-colors">
              {bill.manageBtn}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <p className="text-sm font-semibold text-gray-700">{bill.monthlyUsage}</p>
        </div>
        <div className="space-y-3">
          {usageStats.map((stat) => (
            <div key={stat.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">{stat.label}</span>
                <span className="text-xs font-medium text-gray-700">
                  {stat.current} / {stat.max}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6c47ff] rounded-full"
                  style={{ width: `${(stat.current / stat.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
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
                <span className="text-sm font-semibold text-gray-700">
                  {record.amount}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {bill.paid}
                </span>
                <button className="text-xs font-medium text-[#6c47ff] hover:underline flex items-center gap-1">
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
