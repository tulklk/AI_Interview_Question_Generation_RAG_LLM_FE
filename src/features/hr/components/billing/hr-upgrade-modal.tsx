"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Clock, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import type { HrPlanId } from "@/features/hr/types/hr-subscription";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  listSubscriptionPlans,
  createUpgradePaymentOrder,
  getUpgradePaymentStatus,
  type SubscriptionPlan,
  type UpgradePaymentIntent,
} from "@/features/subscription/services/subscription.service";

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
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const { addToast } = useToast();
  const { refresh } = useHrSubscription();
  const sub = t.settingsPage.subscription;
  const bp = sub.paymentPanel;

  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [payment, setPayment] = useState<UpgradePaymentIntent | null>(null);
  const [polling, setPolling] = useState(false);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const finishingRef = useRef(false);

  const planCardRows = sub.planCardRows as Record<HrPlanId, { text: string; included: boolean }[]>;
  const rows = (planCardRows.HR_PREMIUM ?? []).filter((r) => r.included);

  const qrSrc =
    payment?.qrImageUrl ||
    (payment?.qrContent
      ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payment.qrContent)}`
      : undefined);

  // ── Mount / keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    void listSubscriptionPlans("HR")
      .then((plans) => setPlan(plans.find((p) => p.code === "HR_PREMIUM") ?? null))
      .finally(() => setPlanLoading(false));
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // ── Polling for payment status ────────────────────────────────────────────
  useEffect(() => {
    if (!payment?.orderCode) return;
    let stop = false;
    setPolling(true);
    const id = window.setInterval(async () => {
      if (stop || finishingRef.current) return;
      try {
        const status = await getUpgradePaymentStatus(payment.orderCode);
        if (stop) return;
        const s = (status.status || "").toUpperCase();
        if (["PAID", "COMPLETED", "FREE", "CONFIRMED"].includes(s)) {
          stop = true;
          finishingRef.current = true;
          window.clearInterval(id);
          setPolling(false);
          await refresh();
          addToast("success", sub.upgradeSuccess);
          onClose();
        } else if (["EXPIRED", "FAILED", "CANCELLED", "CANCELED"].includes(s)) {
          stop = true;
          window.clearInterval(id);
          setPolling(false);
          addToast("error", sub.orderExpiredToast);
        }
      } catch {
        // ignore network hiccup, keep polling
      }
    }, 3_000);
    return () => {
      stop = true;
      setPolling(false);
      window.clearInterval(id);
    };
  }, [payment?.orderCode, refresh, addToast, sub.upgradeSuccess, sub.orderExpiredToast, onClose]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  useEffect(() => {
    const expiresAt = payment?.expiresAt;
    if (!expiresAt || payment?.amount === 0) { setSecsLeft(null); return; }
    const expiry = new Date(expiresAt).getTime();
    const computeSecs = () => Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    setSecsLeft(computeSecs());
    const id = setInterval(() => {
      const s = computeSecs();
      setSecsLeft(s);
      if (s === 0) clearInterval(id);
    }, 1_000);
    return () => clearInterval(id);
  }, [payment?.expiresAt, payment?.amount]);

  // ── Status localizer ──────────────────────────────────────────────────────
  function localizeStatus(raw: string): { label: string; color: string } {
    const s = (raw || "").toUpperCase();
    if (["PAID", "COMPLETED", "FREE", "CONFIRMED"].includes(s))
      return { label: lang === "vi" ? "Đã thanh toán" : "Paid", color: "text-emerald-600 dark:text-emerald-400" };
    if (s === "PENDING")
      return { label: lang === "vi" ? "Chờ thanh toán" : "Pending", color: "text-amber-600 dark:text-amber-400" };
    if (s === "FAILED")
      return { label: lang === "vi" ? "Thất bại" : "Failed", color: "text-red-500 dark:text-red-400" };
    if (["CANCELLED", "CANCELED"].includes(s))
      return { label: lang === "vi" ? "Đã hủy" : "Cancelled", color: "text-red-500 dark:text-red-400" };
    if (s === "EXPIRED")
      return { label: lang === "vi" ? "Đã hết hạn" : "Expired", color: "text-red-500 dark:text-red-400" };
    return { label: raw, color: portalHeading };
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleCreateOrder() {
    setCreatingOrder(true);
    finishingRef.current = false;
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

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      addToast("success", bp.copiedToast);
    } catch {
      addToast("error", bp.copyFailedToast);
    }
  }

  if (!mounted) return null;

  const statusObj = localizeStatus(payment?.status || "Pending");

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <AnimatePresence mode="wait">
        <motion.div
          key={payment ? "qr" : "plan"}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "relative z-10 w-full overflow-y-auto max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700",
            payment ? "max-w-2xl" : "max-w-sm"
          )}
        >
          {/* ── Header ── */}
          <div className="relative px-6 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3">
            <div className="flex-1 min-w-0 pr-8">
              <h2 className={cn("text-[15px] font-bold leading-tight", portalHeading)}>
                {payment ? bp.title : sub.sectionTitle}
              </h2>
              {!payment && (
                <p className={cn("text-[11px] mt-0.5", portalSubtext)}>{sub.sectionSubtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {!payment ? (
              /* ── Plan card ── */
              <div className="relative flex flex-col rounded-xl border border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/40 dark:bg-violet-950/20 p-4 gap-3">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide text-white bg-violet-600 px-3 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                  {sub.popular}
                </span>
                <div className="pt-3">
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", portalSubtext)}>
                    {sub.planNames.HR_PREMIUM}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {planLoading ? (
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
                <ul className="flex flex-col gap-1.5">
                  {rows.map((row, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                      <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className={cn("leading-snug", portalHeading)}>{row.text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void handleCreateOrder()}
                  disabled={creatingOrder}
                  className="mt-1 w-full text-[12px] font-semibold py-2.5 rounded-lg transition-colors bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creatingOrder ? (
                    <><Loader2 size={13} className="animate-spin" />{lang === "vi" ? "Đang tạo đơn..." : "Processing..."}</>
                  ) : (
                    sub.planCta.HR_PREMIUM
                  )}
                </button>
              </div>
            ) : (
              /* ── QR payment panel ── */
              <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,220px)_1fr] gap-4 items-start">

                {/* Left: QR + countdown */}
                <div className="flex flex-col items-center gap-2 w-full">
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt="SePay QR"
                      className="w-full max-w-50 sm:max-w-full aspect-square object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-2"
                    />
                  ) : (
                    <div className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4">
                      <div className={cn("text-[11px] mb-1", portalSubtext)}>QR content</div>
                      <div className={cn("break-all text-[11px]", portalHeading)}>{payment.qrContent || bp.noQrData}</div>
                    </div>
                  )}

                  {polling && (
                    <div className={cn("text-xs text-center", portalHeading)}>{bp.waitingWebhook}</div>
                  )}

                  {/* Countdown chip */}
                  {secsLeft !== null && (
                    <div
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-full px-4 py-2 select-none",
                        secsLeft === 0
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                          : secsLeft <= 30
                            ? "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 animate-pulse"
                            : secsLeft <= 120
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      <Clock size={14} />
                      {secsLeft === 0 ? (
                        <span className="text-sm font-semibold">{lang === "vi" ? "Mã đã hết hạn" : "Code expired"}</span>
                      ) : (
                        <>
                          <span className="text-base font-bold font-mono tabular-nums tracking-wide">{formatCountdown(secsLeft)}</span>
                          <span className="text-xs font-medium opacity-70">{lang === "vi" ? "còn lại" : "left"}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Order info */}
                <div className="space-y-2.5 min-w-0 w-full">
                  <div>
                    <div className={cn("text-[10px] uppercase tracking-wider opacity-55 mb-0.5", portalSubtext)}>{bp.orderCode}</div>
                    <div className={cn("text-xs font-mono font-semibold break-all leading-snug", portalHeading)}>{payment.orderCode}</div>
                  </div>
                  <div>
                    <div className={cn("text-[10px] uppercase tracking-wider opacity-55 mb-0.5", portalSubtext)}>{bp.amount}</div>
                    <div className="text-xl font-extrabold text-primary">{payment.amount.toLocaleString(locale)} {payment.currency}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                      <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>{bp.status}</span>
                      <span className={cn("text-[12px] font-semibold text-right", statusObj.color)}>{statusObj.label}</span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                      <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>{bp.expiresAt}</span>
                      <span className={cn("text-[11px] text-right tabular-nums", portalSubtext)}>
                        {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString(locale) : "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                      <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>{bp.bank}</span>
                      <span className={cn("text-[12px] font-semibold text-right", portalHeading)}>
                        {payment.bankName || "--"}
                        {payment.bankAccountNumber ? ` — ${payment.bankAccountNumber}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                      <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>{bp.accountHolder}</span>
                      <span className={cn("text-[12px] font-semibold text-right", portalHeading)}>{payment.bankAccountName || "--"}</span>
                    </div>
                  </div>

                  {/* Transfer content */}
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-2">
                    <div className="min-w-0">
                      <div className={cn("text-[10px] uppercase tracking-wider opacity-55 mb-0.5", portalSubtext)}>{bp.transferContent}</div>
                      <div className={cn("text-[12px] font-semibold break-all leading-snug", portalHeading)}>
                        {payment.transferContent || payment.orderCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyText(payment.transferContent || payment.orderCode)}
                      className="shrink-0 inline-flex items-center gap-1 text-primary text-xs font-medium hover:opacity-80 transition-opacity"
                    >
                      <Copy size={12} />
                      {bp.copyBtn}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bottom buttons (chỉ hiện khi đang ở view QR) ── */}
            {payment && <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => { setPayment(null); finishingRef.current = false; }}
                className={cn(
                  "flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                  portalHeading
                )}
              >
                {lang === "vi" ? "Quay lại" : "Back"}
              </button>
              <button
                type="button"
                onClick={() => { setPayment(null); finishingRef.current = false; void handleCreateOrder(); }}
                disabled={creatingOrder}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              >
                {creatingOrder ? (
                  <><Loader2 size={13} className="animate-spin" />{lang === "vi" ? "Đang tạo đơn..." : "Processing..."}</>
                ) : (
                  sub.newOrderBtn
                )}
              </button>
            </div>}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
