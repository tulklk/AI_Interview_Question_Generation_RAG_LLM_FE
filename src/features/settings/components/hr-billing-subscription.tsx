"use client";

import { useRef } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import type { HrFeatureId, HrPlanId } from "@/features/hr/types/hr-subscription";
import {
  HR_PLAN_IDS,
  HR_PLANS,
  HR_SUBSCRIPTION_FEATURE_ORDER,
  isOverPlanUsageQuota,
} from "@/features/hr/data/hr-subscription";
import {
  portalCard,
  portalDivider,
  portalHeading,
  portalIconWell,
  portalSubtext,
  portalTableRow,
} from "@/shared/utils/portal-ui";

const LIMIT_ROW_KEYS = [
  "jdsPerMonth",
  "questionsPerMonth",
  "combinedExports",
  "publishedBrandedSetsPerMonth",
  "historyRetentionDays",
  "maxSeats",
  "maxQuestionsPerRun",
] as const;

export function HrBillingSubscription() {
  const { t } = useLanguage();
  const sub = t.settingsPage.subscription;
  const { planId, setPlanId } = useHrSubscription();
  const plansRef = useRef<HTMLDivElement>(null);

  const planNames = sub.planNames as Record<HrPlanId, string>;
  const planSub = sub.planSub as Record<HrPlanId, string>;
  const planCta = sub.planCta as Record<HrPlanId, string>;
  const planCardRows = sub.planCardRows as Record<
    HrPlanId,
    { text: string; included: boolean }[]
  >;
  const featureLabels = sub.featureLabels as Record<HrFeatureId, string>;
  const limitLabels = sub.limitRows as Record<(typeof LIMIT_ROW_KEYS)[number], string>;

  function scrollToPlans() {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function formatUsdPrice(priceUsd: number | null) {
    if (priceUsd === null) return sub.priceCustom;
    if (priceUsd === 0) return "$0";
    return `$${priceUsd}`;
  }

  const current = HR_PLANS[planId];

  return (
    <div className="space-y-10">
      <header className="space-y-3 max-w-3xl">
        <h2 className={cn("text-xl sm:text-2xl font-bold tracking-tight", portalHeading)}>
          {sub.sectionTitle}
        </h2>
        <p className={cn("text-sm sm:text-base leading-relaxed", portalSubtext)}>{sub.sectionSubtitle}</p>
        <p className={cn("text-sm font-medium leading-relaxed border-l-4 border-[#6c47ff] pl-4", portalHeading)}>
          {sub.valueLine}
        </p>
        <p className={cn("text-xs sm:text-sm leading-relaxed", portalSubtext)}>{sub.roiLine}</p>
        <p className={cn("text-xs sm:text-sm leading-relaxed italic", portalSubtext)}>{sub.capabilitiesIntro}</p>
      </header>

      <div className="bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-10 -translate-y-10" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-white/70 text-xs font-medium mb-0.5">{sub.currentSummary}</p>
              <p className="text-white text-2xl font-bold leading-none">
                {planNames[planId]}
                {sub.planSuffix ? ` ${sub.planSuffix}` : ""}
              </p>
              <p className="text-white/80 text-sm mt-2 max-w-md">{planSub[planId]}</p>
            </div>
            <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full shrink-0">
              {t.settingsPage.billing.active}
            </span>
          </div>
          <p className="text-white text-xl font-bold mb-1">
            {formatUsdPrice(current.priceUsd)}
            {current.priceUsd !== null ? (
              <span className="text-white/70 text-sm font-normal">{t.settingsPage.billing.perMonth}</span>
            ) : null}
          </p>
          <p className="text-white/70 text-xs mb-4">
            {sub.renews}: {sub.renewsDate}
          </p>
          <button
            type="button"
            onClick={scrollToPlans}
            className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
          >
            {sub.scrollToPlans}
          </button>
        </div>
      </div>

      <div ref={plansRef} className="space-y-4">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{sub.plansTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch min-w-0">
          {HR_PLAN_IDS.map((id) => {
            const def = HR_PLANS[id];
            const active = planId === id;
            const recommended = def.recommended === true;
            const rows = planCardRows[id] ?? [];

            return (
              <div
                key={id}
                className={cn(
                  "rounded-xl border p-5 flex flex-col h-full min-h-0 min-w-0 overflow-hidden relative transition-shadow",
                  portalCard,
                  recommended && "ring-2 ring-[#6c47ff] ring-offset-2 dark:ring-offset-gray-900 shadow-md",
                  active ? "border-[#6c47ff] border-2" : "border-gray-200 dark:border-gray-700"
                )}
              >
                {recommended && (
                  <div className="absolute top-3 left-4 right-4 flex flex-wrap items-center gap-2 z-10 pointer-events-none">
                    <span className="pointer-events-auto text-[10px] font-bold uppercase tracking-wide text-white bg-[#6c47ff] px-2.5 py-1 rounded-full shadow-sm">
                      {sub.popular}
                    </span>
                    <span className="pointer-events-auto text-[10px] font-semibold text-[#6c47ff] bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                      {sub.recommendedSubtitle}
                    </span>
                  </div>
                )}

                <div className={cn("shrink-0 space-y-1", recommended ? "pt-10" : "pt-1")}>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", portalSubtext)}>
                    {planNames[id]}
                  </p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={cn("text-3xl font-bold", portalHeading)}>{formatUsdPrice(def.priceUsd)}</span>
                    {def.priceUsd !== null ? (
                      <span className={cn("text-sm", portalSubtext)}>{t.settingsPage.billing.perMonth}</span>
                    ) : null}
                  </div>
                  {id === "basic" && (
                    <p className={cn("text-[11px]", portalSubtext)}>{sub.priceFreeTrialNote}</p>
                  )}
                  <p className={cn("text-xs mt-2 leading-relaxed break-words", portalSubtext)}>{planSub[id]}</p>
                </div>

                <ul
                  className={cn(
                    "mt-3 flex-1 min-h-0 overflow-y-auto overscroll-y-contain border-t pt-3 space-y-2 pr-0.5",
                    portalDivider,
                    "[scrollbar-gutter:stable]"
                  )}
                >
                  {rows.map((row, idx) => (
                    <li key={idx} className="flex gap-2 text-xs leading-snug min-w-0">
                      <span className="shrink-0 mt-0.5">
                        {row.included ? (
                          <Check size={14} className="text-emerald-600" aria-hidden />
                        ) : (
                          <Minus size={14} className="text-gray-300 dark:text-gray-600" aria-hidden />
                        )}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 break-words",
                          row.included ? cn("font-medium", portalHeading) : "text-gray-400 dark:text-gray-500 line-through"
                        )}
                      >
                        {row.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className={cn("shrink-0 mt-auto pt-4 border-t space-y-2", portalDivider)}>
                  {id === "enterprise" && (
                    <p className={cn("text-[10px] leading-snug break-words", portalSubtext)}>{sub.enterpriseDemoNote}</p>
                  )}
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => setPlanId(id)}
                    className={cn(
                      "w-full text-sm font-semibold py-2.5 rounded-lg transition-colors",
                      active
                        ? cn("cursor-not-allowed", portalIconWell, portalSubtext)
                        : recommended
                          ? "bg-[#6c47ff] text-white hover:bg-[#5535dd] shadow-sm"
                          : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
                    )}
                  >
                    {active ? sub.currentPlanBtn : planCta[id]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="space-y-4">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{sub.whyUpgradeTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {sub.whyUpgradePoints.map((pt, i) => (
            <div
              key={i}
              className={cn(portalCard, "p-4 shadow-sm flex flex-col gap-2")}
            >
              <p className={cn("text-sm font-bold", portalHeading)}>{pt.title}</p>
              <p className={cn("text-xs leading-relaxed", portalSubtext)}>{pt.body}</p>
            </div>
          ))}
        </div>
        <p className={cn("text-xs max-w-3xl leading-relaxed", portalSubtext)}>{sub.premiumNote}</p>
      </section>

      <div>
        <h3 className={cn("text-base font-semibold mb-3", portalHeading)}>{sub.compareTitle}</h3>
        <div className={cn("overflow-x-auto rounded-xl border", portalDivider)}>
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className={cn("border-b", portalDivider, portalIconWell)}>
                <th className={cn("text-left px-3 py-2 font-semibold w-[26%]", portalSubtext)}>
                  {sub.featureColumn}
                </th>
                {HR_PLAN_IDS.map((pid) => (
                  <th key={pid} className={cn("text-center px-2 py-2 font-semibold", portalHeading)}>
                    {planNames[pid]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn("divide-y", portalDivider)}>
              {HR_SUBSCRIPTION_FEATURE_ORDER.map((fid) => (
                <tr key={fid} className={portalTableRow}>
                  <td className={cn("px-3 py-2", portalHeading)}>{featureLabels[fid]}</td>
                  {HR_PLAN_IDS.map((pid) => {
                    const ok = HR_PLANS[pid].features[fid];
                    return (
                      <td key={pid} className="text-center px-2 py-2">
                        {ok ? (
                          <Check size={14} className="inline text-emerald-600" aria-label={sub.included} />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">{sub.notIncluded}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {LIMIT_ROW_KEYS.map((rowKey) => (
                <tr key={rowKey} className={portalIconWell}>
                  <td className={cn("px-3 py-2 font-medium", portalSubtext)}>{limitLabels[rowKey]}</td>
                  {HR_PLAN_IDS.map((pid) => {
                    const L = HR_PLANS[pid].limits;
                    let val: string | number = "";
                    if (rowKey === "jdsPerMonth") val = L.jdsPerMonth >= 9999 ? "∞" : L.jdsPerMonth;
                    if (rowKey === "questionsPerMonth")
                      val = L.questionsPerMonth >= 9999 ? "∞" : L.questionsPerMonth;
                    if (rowKey === "combinedExports")
                      val =
                        L.pdfExportsPerMonth + L.docxExportsPerMonth >= 9999
                          ? "∞"
                          : L.pdfExportsPerMonth + L.docxExportsPerMonth;
                    if (rowKey === "publishedBrandedSetsPerMonth")
                      val =
                        L.publishedBrandedSetsPerMonth >= 9999
                          ? "∞"
                          : L.publishedBrandedSetsPerMonth;
                    if (rowKey === "historyRetentionDays")
                      val = L.historyRetentionDays >= 9999 ? "∞" : L.historyRetentionDays;
                    if (rowKey === "maxSeats") val = L.maxSeats >= 9999 ? "∞" : L.maxSeats;
                    if (rowKey === "maxQuestionsPerRun") val = L.maxQuestionsPerRun;
                    return (
                      <td key={pid} className={cn("text-center px-2 py-2 font-semibold", portalHeading)}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={cn("text-[11px] mt-2", portalSubtext)}>{sub.limitsNote}</p>
      </div>

      {isOverPlanUsageQuota(planId) && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200">
          <p className="font-semibold mb-1">{t.hrSubscription.quotaExceededTitle}</p>
          <p>
            {t.hrSubscription.quotaExceededBody}{" "}
            <Link href="/hr/settings#billing" className="font-semibold text-[#6c47ff] hover:underline">
              {t.hrSubscription.goToSubscription}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
