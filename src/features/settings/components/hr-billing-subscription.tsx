"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Minus, Loader2, X, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import type { HrFeatureId, HrPlanId } from "@/features/hr/types/hr-subscription";
import { HR_PLAN_IDS } from "@/features/hr/data/hr-subscription";
import {
  createUpgradePaymentOrder,
  getUpgradePaymentStatus,
  listSubscriptionPlans,
  type SubscriptionPlan,
  type UpgradePaymentIntent,
} from "@/features/subscription/services/subscription.service";
import {
  portalCard,
  portalDivider,
  portalHeading,
  portalIconWell,
  portalSubtext,
  portalTableRow,
} from "@/shared/utils/portal-ui";

const FEATURE_ORDER: HrFeatureId[] = ["unlimitedGenerate", "export", "askAi", "publish"];

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currency || "VND", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function planHasFeature(plan: SubscriptionPlan, featureId: HrFeatureId): boolean {
  if (featureId === "export") return plan.limits.canExport;
  if (featureId === "askAi") return plan.limits.askAiPerMonth > 0;
  if (featureId === "publish") return plan.limits.canPublish;
  if (featureId === "unlimitedGenerate") return plan.limits.generateUnlimited;
  return false;
}

export function HrBillingSubscription() {
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const { addToast } = useToast();
  const sub = t.settingsPage.subscription;
  const {
    planId,
    subscription,
    loading,
    canGenerateNow,
    cooldownEndsAt,
    cancelPremium,
    purchaseAskAiPack,
    refresh,
  } = useHrSubscription();
  const plansRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [payment, setPayment] = useState<UpgradePaymentIntent | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [polling, setPolling] = useState(false);
  const qrImageFromContent = payment?.qrContent
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payment.qrContent)}`
    : null;

  useEffect(() => {
    void listSubscriptionPlans("HR")
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const planNames = sub.planNames as Record<HrPlanId, string>;
  const planSub = sub.planSub as Record<HrPlanId, string>;
  const planCta = sub.planCta as Record<HrPlanId, string>;
  const planCardRows = sub.planCardRows as Record<HrPlanId, { text: string; included: boolean }[]>;
  const featureLabels = sub.featureLabels as Record<HrFeatureId, string>;

  function scrollToPlans() {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isPremium = planId === "HR_PREMIUM";

  async function handlePlanClick(id: HrPlanId) {
    if (id === planId || busy) return;
    if (id !== "HR_FREE") {
      void handleUpgradeClick();
      return;
    }
    setBusy(true);
    try {
      await cancelPremium();
      addToast("success", sub.downgradeSuccess);
    } catch {
      addToast("error", sub.planChangeError);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpgradeClick() {
    setCreatingOrder(true);
    try {
      const order = await createUpgradePaymentOrder();
      setPayment(order);
      addToast("success", sub.orderCreatedToast);
    } catch {
      addToast("error", sub.createOrderError);
    } finally {
      setCreatingOrder(false);
    }
  }

  async function copyText(value: string, copiedMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      addToast("success", copiedMessage);
    } catch {
      addToast("error", sub.paymentPanel.copyFailedToast);
    }
  }

  useEffect(() => {
    if (!payment?.orderCode) return;
    let stop = false;
    setPolling(true);
    const id = window.setInterval(async () => {
      if (stop) return;
      try {
        const status = await getUpgradePaymentStatus(payment.orderCode);
        if (stop) return;
        setPayment((prev) => (prev ? { ...prev, ...status } : status));
        const normalized = (status.status || "").toUpperCase();
        if (normalized === "PAID") {
          stop = true;
          window.clearInterval(id);
          await refresh();
          setPayment(null);
          setPolling(false);
          addToast("success", sub.upgradeSuccess);
        } else if (normalized === "EXPIRED" || normalized === "FAILED") {
          stop = true;
          window.clearInterval(id);
          setPolling(false);
        }
      } catch {
        // ignore network hiccup, keep polling
      }
    }, 3000);
    return () => {
      stop = true;
      setPolling(false);
      window.clearInterval(id);
    };
  }, [payment?.orderCode, refresh, addToast, sub.upgradeSuccess]);

  async function handleBuyAskAiPack() {
    setBusy(true);
    try {
      await purchaseAskAiPack(200);
      addToast("success", sub.askAiPackSuccess);
    } catch {
      addToast("error", sub.askAiPackError);
    } finally {
      setBusy(false);
    }
  }

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
      </header>

      <div className="bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-10 -translate-y-10" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-white/70 text-xs font-medium mb-0.5">{sub.currentSummary}</p>
              <p className="text-white text-2xl font-bold leading-none">
                {loading ? "…" : subscription?.planName || planNames[planId]}
              </p>
              <p className="text-white/80 text-sm mt-2 max-w-md">
                {subscription?.planCode
                  ? `${subscription.planCode} · ${subscription.status}`
                  : planSub[planId]}
              </p>
            </div>
            <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full shrink-0">
              {t.settingsPage.billing.active}
            </span>
          </div>
          <p className="text-white text-xl font-bold mb-1">
            {subscription ? formatMoney(subscription.priceMonthly, subscription.currency) : "…"}
            {subscription && (
              <span className="text-white/70 text-sm font-normal">{t.settingsPage.billing.perMonth}</span>
            )}
          </p>
          <p className="text-white/70 text-xs mb-2">
            {sub.renews}: {formatDate(subscription?.periodEnd, locale)}
          </p>
          {subscription && (
            <p className="text-white/80 text-xs mb-4">
              Ask-AI: {subscription.askAiUsed}/{subscription.askAiLimit}
              {isPremium && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleBuyAskAiPack()}
                  className="ml-3 underline hover:no-underline disabled:opacity-50"
                >
                  + Pack Ask-AI
                </button>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={scrollToPlans}
            className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
          >
            {sub.scrollToPlans}
          </button>
        </div>
      </div>

      {!canGenerateNow && cooldownEndsAt && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200">
          <p className="font-semibold mb-1">{t.hrSubscription.quotaExceededTitle}</p>
          <p>{t.hrSubscription.quotaExceededBody.replace("{{time}}", cooldownEndsAt.toLocaleString())}</p>
        </div>
      )}

      <div ref={plansRef} className="space-y-4">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{sub.plansTitle}</h3>
        {plansLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-[#6c47ff]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch min-w-0">
            {HR_PLAN_IDS.map((id) => {
              const livePlan = plans.find((p) => p.code === id);
              const active = planId === id;
              const recommended = id === "HR_PREMIUM";
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
                      <span className={cn("text-3xl font-bold", portalHeading)}>
                        {livePlan ? formatMoney(livePlan.priceMonthly, livePlan.currency) : "…"}
                      </span>
                      {livePlan && livePlan.priceMonthly > 0 ? (
                        <span className={cn("text-sm", portalSubtext)}>{t.settingsPage.billing.perMonth}</span>
                      ) : null}
                    </div>
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

                  <div className={cn("shrink-0 mt-auto pt-4 border-t", portalDivider)}>
                    <button
                      type="button"
                      disabled={active || busy || creatingOrder}
                      onClick={() => void handlePlanClick(id)}
                      className={cn(
                        "w-full text-sm font-semibold py-2.5 rounded-lg transition-colors inline-flex items-center justify-center gap-2",
                        active
                          ? cn("cursor-not-allowed", portalIconWell, portalSubtext)
                          : recommended
                            ? "bg-[#6c47ff] text-white hover:bg-[#5535dd] shadow-sm"
                            : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
                      )}
                    >
                      {busy || (creatingOrder && id !== "HR_FREE") ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      {active ? sub.currentPlanBtn : planCta[id]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <section className="space-y-4">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{sub.whyUpgradeTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {sub.whyUpgradePoints.map((pt, i) => (
            <div key={i} className={cn(portalCard, "p-4 shadow-sm flex flex-col gap-2")}>
              <p className={cn("text-sm font-bold", portalHeading)}>{pt.title}</p>
              <p className={cn("text-xs leading-relaxed", portalSubtext)}>{pt.body}</p>
            </div>
          ))}
        </div>
        <p className={cn("text-xs max-w-3xl leading-relaxed", portalSubtext)}>{sub.premiumNote}</p>
      </section>

      {!plansLoading && plans.length > 0 && (
        <div>
          <h3 className={cn("text-base font-semibold mb-3", portalHeading)}>{sub.compareTitle}</h3>
          <div className={cn("overflow-x-auto rounded-xl border", portalDivider)}>
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className={cn("border-b", portalDivider, portalIconWell)}>
                  <th className={cn("text-left px-3 py-2 font-semibold w-[40%]", portalSubtext)}>
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
                {FEATURE_ORDER.map((fid) => (
                  <tr key={fid} className={portalTableRow}>
                    <td className={cn("px-3 py-2", portalHeading)}>{featureLabels[fid]}</td>
                    {HR_PLAN_IDS.map((pid) => {
                      const p = plans.find((x) => x.code === pid);
                      const ok = p ? planHasFeature(p, fid) : false;
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
                <tr className={portalIconWell}>
                  <td className={cn("px-3 py-2 font-medium", portalSubtext)}>{sub.limitRows.generateCooldownHours}</td>
                  {HR_PLAN_IDS.map((pid) => {
                    const p = plans.find((x) => x.code === pid);
                    const h = p?.limits.generateCooldownHours ?? 0;
                    return (
                      <td key={pid} className={cn("text-center px-2 py-2 font-semibold", portalHeading)}>
                        {p?.limits.generateUnlimited ? "∞" : `${h}h`}
                      </td>
                    );
                  })}
                </tr>
                <tr className={portalIconWell}>
                  <td className={cn("px-3 py-2 font-medium", portalSubtext)}>{sub.limitRows.planRegeneratePerDraft}</td>
                  {HR_PLAN_IDS.map((pid) => {
                    const p = plans.find((x) => x.code === pid);
                    return (
                      <td key={pid} className={cn("text-center px-2 py-2 font-semibold", portalHeading)}>
                        {p?.limits.planRegeneratePerDraft ?? "—"}
                      </td>
                    );
                  })}
                </tr>
                <tr className={portalIconWell}>
                  <td className={cn("px-3 py-2 font-medium", portalSubtext)}>{sub.limitRows.askAiPerMonth}</td>
                  {HR_PLAN_IDS.map((pid) => {
                    const p = plans.find((x) => x.code === pid);
                    const n = p?.limits.askAiPerMonth ?? 0;
                    return (
                      <td key={pid} className={cn("text-center px-2 py-2 font-semibold", portalHeading)}>
                        {n > 0 ? n : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className={cn("text-[11px] mt-2", portalSubtext)}>{sub.limitsNote}</p>
        </div>
      )}

      {!canGenerateNow && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200">
          <p className="font-semibold mb-1">{t.hrSubscription.quotaExceededTitle}</p>
          <p>
            {t.hrSubscription.quotaExceededBody}{" "}
            <Link href="/hr/generate" className="font-semibold text-[#6c47ff] hover:underline">
              {t.hrSubscription.goToSubscription}
            </Link>
          </p>
        </div>
      )}

      {payment && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={(e) => { if (e.currentTarget === e.target) setPayment(null); }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayment(null)} />
              <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="relative px-6 pt-6 pb-5 border-b border-gray-200 dark:border-gray-800">
                  <h2 className={cn("text-[15px] font-bold", portalHeading)}>{sub.paymentPanel.title}</h2>
                  <button
                    type="button"
                    onClick={() => setPayment(null)}
                    className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,280px)_1fr] gap-4 items-start">
                    <div className="flex flex-col items-center gap-2">
                      {payment.qrImageUrl || qrImageFromContent ? (
                        <img
                          src={payment.qrImageUrl || qrImageFromContent || undefined}
                          alt="SePay QR"
                          className="w-full max-w-[280px] aspect-square object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-2"
                        />
                      ) : (
                        <div className="w-full max-w-[280px] rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3">
                          <div className={cn("text-[11px] mb-1", portalSubtext)}>QR content</div>
                          <div className={cn("break-all text-[11px]", portalHeading)}>
                            {payment.qrContent || sub.paymentPanel.noQrData}
                          </div>
                        </div>
                      )}
                      {polling && (
                        <div className="text-xs text-[#6c47ff] text-center">{sub.paymentPanel.waitingWebhook}</div>
                      )}
                    </div>
                    <div className="space-y-2.5 min-w-0">
                      <div className={cn("text-xs", portalSubtext)}>
                        <span className="font-medium opacity-80">{sub.paymentPanel.orderCode}</span>
                        <div className={cn("mt-0.5 break-all text-sm font-semibold", portalHeading)}>{payment.orderCode}</div>
                      </div>
                      <div className={cn("text-xs", portalSubtext)}>
                        <span className="font-medium opacity-80">{sub.paymentPanel.amount}</span>
                        <div className={cn("mt-0.5 text-base font-bold text-[#6c47ff]", portalHeading)}>
                          {payment.amount.toLocaleString(locale)} {payment.currency}
                        </div>
                      </div>
                      <div className={cn("text-xs", portalSubtext)}>
                        {sub.paymentPanel.status}:{" "}
                        <span className={cn("font-semibold", portalHeading)}>{(payment.status || "Pending").toUpperCase()}</span>
                      </div>
                      <div className={cn("text-xs", portalSubtext)}>
                        {sub.paymentPanel.expiresAt}:{" "}
                        {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString(locale) : "--"}
                      </div>
                      <div className={cn("text-xs", portalSubtext)}>
                        {sub.paymentPanel.bank}: {payment.bankName || "--"} — {payment.bankAccountNumber || "--"}
                      </div>
                      <div className={cn("text-xs", portalSubtext)}>
                        {sub.paymentPanel.accountHolder}: {payment.bankAccountName || "--"}
                      </div>
                      <div className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className={cn("text-[11px] mb-0.5", portalSubtext)}>{sub.paymentPanel.transferContent}</div>
                          <div className={cn("text-xs font-semibold break-all", portalHeading)}>
                            {payment.transferContent || payment.orderCode}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copyText(payment.transferContent || payment.orderCode, sub.paymentPanel.copiedToast)}
                          className="shrink-0 inline-flex items-center gap-1 text-[#6c47ff] text-xs font-medium pt-0.5"
                        >
                          <Copy size={12} />
                          {sub.paymentPanel.copyBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5 pt-5">
                    <button
                      type="button"
                      onClick={() => setPayment(null)}
                      className={cn(
                        "flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                        portalHeading
                      )}
                    >
                      {sub.backBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpgradeClick()}
                      disabled={creatingOrder}
                      className="flex-1 h-10 rounded-xl text-sm font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {creatingOrder ? <Loader2 size={14} className="animate-spin" /> : null}
                      {sub.newOrderBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
