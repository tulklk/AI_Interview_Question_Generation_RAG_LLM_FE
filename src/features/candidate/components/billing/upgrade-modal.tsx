"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Crown, Check, Copy, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getCandidateSubscription,
  getCandidateBillingUsage,
  getCandidatePaymentHistory,
  getUpgradeOrderStatus,
  upgradeToPremium,
} from "@/features/candidate/services/candidate-billing.service";
import {
  isPremiumPlanCode,
  listSubscriptionPlans,
} from "@/features/subscription/services/subscription.service";
import type {
  CandidateSubscription,
  CandidateBillingUsage,
  PaymentHistoryItem,
} from "@/features/candidate/types/billing";
import type { UpgradePaymentIntent } from "@/features/subscription/services/subscription.service";

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
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const { addToast } = useToast();
  const b = t.jobseekerSettingsPage.billing;
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [payment, setPayment] = useState<UpgradePaymentIntent | null>(null);
  const [polling, setPolling] = useState(false);
  const qrImageFromContent =
    payment?.qrContent
      ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payment.qrContent)}`
      : null;
  const [liveMonthlyPrice, setLiveMonthlyPrice] = useState<number | null>(null);
  const [liveCurrency, setLiveCurrency] = useState<string>("VND");

  function formatPlanPrice(amount: number) {
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: liveCurrency || "VND",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString("vi-VN")} ${liveCurrency || "VND"}`;
    }
  }

  useEffect(() => {
    setMounted(true);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    void listSubscriptionPlans("Candidate")
      .then((plans) => {
        const premium = plans.find((p) => isPremiumPlanCode(p.code));
        if (!premium) return;
        setLiveMonthlyPrice(Math.max(0, premium.priceMonthly));
        setLiveCurrency(premium.currency || "VND");
      })
      .catch(() => {
        // giữ fallback để modal vẫn dùng được khi API lỗi
      });
  }, []);

  async function copyText(value: string, copiedMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      addToast("success", copiedMessage);
    } catch {
      addToast("error", b.paymentPanel.copyFailedToast);
    }
  }

  async function handleCreateOrder() {
    setLoading(true);
    try {
      const order = await upgradeToPremium();
      setPayment(order);
      addToast("success", b.orderCreatedToast);
    } catch {
      addToast("error", b.upgradeFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!payment?.orderCode) return;

    let stop = false;
    setPolling(true);
    const id = window.setInterval(async () => {
      if (stop) return;
      try {
        const status = await getUpgradeOrderStatus(payment.orderCode);
        if (stop) return;
        setPayment((prev) => {
          if (!prev) return status;
          return {
            ...prev,
            ...status,
            // Giữ QR/transfer cũ nếu API poll chỉ trả status mà không trả lại chi tiết QR.
            qrImageUrl: status.qrImageUrl ?? prev.qrImageUrl,
            qrContent: status.qrContent ?? prev.qrContent,
            paymentUrl: status.paymentUrl ?? prev.paymentUrl,
            bankName: status.bankName ?? prev.bankName,
            bankAccountName: status.bankAccountName ?? prev.bankAccountName,
            bankAccountNumber: status.bankAccountNumber ?? prev.bankAccountNumber,
            transferContent: status.transferContent ?? prev.transferContent,
          };
        });

        const normalized = (status.status || "").toUpperCase();
        if (normalized === "PAID") {
          stop = true;
          window.clearInterval(id);
          const [sub, use, hist] = await Promise.all([
            getCandidateSubscription(),
            getCandidateBillingUsage(),
            getCandidatePaymentHistory(),
          ]);
          addToast("success", b.upgradeSuccess);
          onDone?.({ subscription: sub, usage: use, history: hist });
          onClose();
        } else if (normalized === "EXPIRED" || normalized === "FAILED") {
          stop = true;
          window.clearInterval(id);
          setPolling(false);
        }
      } catch {
        // ignore network hiccup and keep polling
      }
    }, 3000);

    return () => {
      stop = true;
      setPolling(false);
      window.clearInterval(id);
    };
  }, [payment?.orderCode, onClose, onDone, addToast, b.upgradeSuccess]);

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
        className={cn(
          "relative z-10 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden",
          payment ? "max-w-2xl" : "max-w-md"
        )}
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
          {!payment ? (
            <div className="rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-4 flex items-baseline gap-2">
              <span className={cn("text-2xl font-extrabold", portalHeading)}>
                {liveMonthlyPrice === null ? (
                  <span className="inline-block h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : (
                  formatPlanPrice(liveMonthlyPrice)
                )}
              </span>
              <span className={cn("text-[13px]", portalSubtext)}>{b.perMonth}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className={cn("text-sm font-semibold mb-3", portalHeading)}>{b.paymentPanel.title}</div>
              {/* Desktop: QR trái | thông tin phải; Mobile: xếp dọc, QR to */}
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
                        {payment.qrContent || b.paymentPanel.noQrData}
                      </div>
                    </div>
                  )}
                  {polling && (
                    <div className={cn("text-xs text-primary text-center", portalSubtext)}>
                      {b.paymentPanel.waitingWebhook}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 min-w-0">
                  <div className={cn("text-xs", portalSubtext)}>
                    <span className="font-medium opacity-80">{b.paymentPanel.orderCode}</span>
                    <div className={cn("mt-0.5 break-all text-sm font-semibold", portalHeading)}>{payment.orderCode}</div>
                  </div>
                  <div className={cn("text-xs", portalSubtext)}>
                    <span className="font-medium opacity-80">{b.paymentPanel.amount}</span>
                    <div className={cn("mt-0.5 text-base font-bold text-primary", portalHeading)}>
                      {payment.amount.toLocaleString(locale)} {payment.currency}
                    </div>
                  </div>
                  <div className={cn("text-xs", portalSubtext)}>
                    {b.paymentPanel.status}:{" "}
                    <span className={cn("font-semibold", portalHeading)}>
                      {(payment.status || "Pending").toUpperCase()}
                    </span>
                  </div>
                  <div className={cn("text-xs", portalSubtext)}>
                    {b.paymentPanel.expiresAt}:{" "}
                    {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString(locale) : "--"}
                  </div>
                  <div className={cn("text-xs", portalSubtext)}>
                    {b.paymentPanel.bank}: {payment.bankName || "--"} — {payment.bankAccountNumber || "--"}
                  </div>
                  <div className={cn("text-xs", portalSubtext)}>
                    {b.paymentPanel.accountHolder}: {payment.bankAccountName || "--"}
                  </div>
                  <div className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className={cn("text-[11px] mb-0.5", portalSubtext)}>{b.paymentPanel.transferContent}</div>
                      <div className={cn("text-xs font-semibold break-all", portalHeading)}>
                        {payment.transferContent || payment.orderCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(
                          payment.transferContent || payment.orderCode,
                          b.paymentPanel.copiedToast
                        )
                      }
                      className="shrink-0 inline-flex items-center gap-1 text-primary text-xs font-medium pt-0.5"
                    >
                      <Copy size={12} />
                      {b.paymentPanel.copyBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature list — ẩn khi đang chờ thanh toán để ưu tiên QR */}
          {!payment && (
            <div className="space-y-2">
              {b.premiumFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check size={13} className="text-primary shrink-0" />
                  <span className={cn("text-sm", portalHeading)}>{f}</span>
                </div>
              ))}
            </div>
          )}

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
            {!payment ? (
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={loading}
                className="flex-1 h-10 shimmer-button rounded-xl text-sm font-semibold text-white hr-cta-btn flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {b.upgradingLabel}
                  </>
                ) : (
                  b.createOrderBtn
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPayment(null)}
                className="flex-1 h-10 shimmer-button rounded-xl text-sm font-semibold text-white hr-cta-btn flex items-center justify-center gap-2"
              >
                {b.newOrderBtn}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}
