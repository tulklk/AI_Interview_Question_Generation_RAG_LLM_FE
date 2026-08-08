"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Check, Copy, X, Clock } from "lucide-react";
import type { HubConnection } from "@microsoft/signalr";
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
import {
  createSubscriptionPaymentHubConnection,
  normalizePaymentPaidEvent,
  PAYMENT_PAID_EVENT,
} from "@/features/subscription/services/subscription-payment-hub";
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

/** Poll thưa làm an toàn khi SignalR/WebSocket lỗi (proxy, token…). */
const FALLBACK_POLL_MS = 15_000;

export function UpgradeModal({ onClose, onDone }: UpgradeModalProps) {
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const { addToast } = useToast();
  const b = t.jobseekerSettingsPage.billing;
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [activating, setActivating] = useState(false);

  function handleClose() {
    setIsVisible(false);
    setTimeout(onClose, 180);
  }
  const [payment, setPayment] = useState<UpgradePaymentIntent | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [qrImgFailed, setQrImgFailed] = useState(false);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const qrImageFromContent =
    payment?.qrContent
      ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payment.qrContent)}`
      : null;
  const [liveMonthlyPrice, setLiveMonthlyPrice] = useState<number | null>(null);
  const [liveCurrency, setLiveCurrency] = useState<string>("VND");

  // Ổn định callback — tránh restart connection/poll mỗi lần parent re-render
  const onCloseRef = useRef(onClose);
  const onDoneRef = useRef(onDone);
  const addToastRef = useRef(addToast);
  const upgradeSuccessRef = useRef(b.upgradeSuccess);
  const finishingRef = useRef(false);
  const hubRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
    onDoneRef.current = onDone;
    addToastRef.current = addToast;
    upgradeSuccessRef.current = b.upgradeSuccess;
  }, [onClose, onDone, addToast, b.upgradeSuccess]);

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
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // handleClose chỉ dùng state setter — intentional empty deps for mount listeners
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function handleFreeActivation() {
    if (!payment?.orderCode) return;
    setActivating(true);
    try {
      // Với 0đ order, backend có thể đã upgrade subscription ngay lúc tạo đơn
      // dù status vẫn trả "Pending" — nên kiểm tra thẳng subscription thay vì dựa vào status
      const [sub, use, hist] = await Promise.all([
        getCandidateSubscription(),
        getCandidateBillingUsage(),
        getCandidatePaymentHistory(),
      ]);
      if (sub.planType === "PREMIUM") {
        addToast("success", b.upgradeSuccess);
        onDone?.({ subscription: sub, usage: use, history: hist });
        handleClose();
        return;
      }
      // Subscription chưa upgrade → thử check status đơn thêm 1 lần
      const statusRes = await getUpgradeOrderStatus(payment.orderCode);
      const normalized = (statusRes.status || "").toUpperCase();
      if (["PAID", "FREE", "COMPLETED", "CONFIRMED"].includes(normalized)) {
        const [sub2, use2, hist2] = await Promise.all([
          getCandidateSubscription(),
          getCandidateBillingUsage(),
          getCandidatePaymentHistory(),
        ]);
        addToast("success", b.upgradeSuccess);
        onDone?.({ subscription: sub2, usage: use2, history: hist2 });
        handleClose();
      } else {
        // Backend chưa xử lý xong đơn 0đ — polling/SignalR tiếp tục chạy ngầm
        addToast(
          "success",
          lang === "vi"
            ? "Đang chờ xác nhận từ hệ thống. Vui lòng thử lại sau vài giây."
            : "Awaiting system confirmation. Please try again in a moment."
        );
      }
    } catch {
      addToast("error", b.paymentPanel.activateFailed);
    } finally {
      setActivating(false);
    }
  }

  const finishPaid = useCallback(
    async (orderCode: string) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setWaiting(false);
      setPayment((prev) =>
        prev && prev.orderCode === orderCode ? { ...prev, status: "Paid" } : prev
      );
      try {
        const [sub, use, hist] = await Promise.all([
          getCandidateSubscription(),
          getCandidateBillingUsage(),
          getCandidatePaymentHistory(),
        ]);
        addToastRef.current("success", upgradeSuccessRef.current);
        onDoneRef.current?.({ subscription: sub, usage: use, history: hist });
        setIsVisible(false);
        setTimeout(() => onCloseRef.current(), 180);
      } catch {
        finishingRef.current = false;
        addToastRef.current("error", b.upgradeFailed);
      }
    },
    [b.upgradeFailed]
  );

  async function handleCreateOrder() {
    setLoading(true);
    setQrImgFailed(false);
    finishingRef.current = false;
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

  // SCRUM-387: SignalR primary + poll fallback thưa (không ghi đè QR chi tiết)
  useEffect(() => {
    if (!payment?.orderCode || payment.amount === 0) return;

    const orderCode = payment.orderCode;
    let stop = false;
    setWaiting(true);

    const applyStatusOnly = (status: UpgradePaymentIntent) => {
      setPayment((prev) => {
        if (!prev) return status;
        // Chỉ merge field trạng thái — giữ nguyên QR/transfer từ lúc tạo đơn
        return {
          ...prev,
          status: status.status || prev.status,
          expiresAt: status.expiresAt || prev.expiresAt,
          amount: status.amount || prev.amount,
          currency: status.currency || prev.currency,
          qrImageUrl: status.qrImageUrl ?? prev.qrImageUrl,
          qrContent: status.qrContent ?? prev.qrContent,
          paymentUrl: status.paymentUrl ?? prev.paymentUrl,
          bankName: status.bankName ?? prev.bankName,
          bankAccountName: status.bankAccountName ?? prev.bankAccountName,
          bankAccountNumber: status.bankAccountNumber ?? prev.bankAccountNumber,
          transferContent: status.transferContent ?? prev.transferContent,
        };
      });
    };

    const connection = createSubscriptionPaymentHubConnection();
    hubRef.current = connection;

    connection.on(PAYMENT_PAID_EVENT, (raw: unknown) => {
      if (stop) return;
      const evt = normalizePaymentPaidEvent(raw);
      if (!evt) return;
      if (evt.orderCode.toUpperCase() !== orderCode.toUpperCase()) return;
      void finishPaid(orderCode);
    });

    void connection.start().catch(() => {
      // SignalR fail → poll fallback vẫn chạy
    });

    const pollOnce = async () => {
      if (stop || finishingRef.current) return;
      try {
        const status = await getUpgradeOrderStatus(orderCode);
        if (stop) return;
        applyStatusOnly(status);
        const normalized = (status.status || "").toUpperCase();
        if (normalized === "PAID" || normalized === "FREE" || normalized === "COMPLETED") {
          void finishPaid(orderCode);
        } else if (
          normalized === "EXPIRED" ||
          normalized === "FAILED" ||
          normalized === "CANCELLED"
        ) {
          stop = true;
          setWaiting(false);
          addToastRef.current("error", b.orderExpiredToast);
        }
      } catch {
        // network hiccup
      }
    };

    void pollOnce();
    const pollId = window.setInterval(() => {
      void pollOnce();
    }, FALLBACK_POLL_MS);

    return () => {
      stop = true;
      setWaiting(false);
      window.clearInterval(pollId);
      connection.off(PAYMENT_PAID_EVENT);
      void connection.stop().catch(() => undefined);
      hubRef.current = null;
    };
  }, [payment?.orderCode, payment?.amount, finishPaid, b.orderExpiredToast]);

  // ── Countdown timer — tính từ payment.expiresAt ──────────────────────────
  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  useEffect(() => {
    const expiresAt = payment?.expiresAt;
    if (!expiresAt || payment?.amount === 0) {
      setSecsLeft(null);
      return;
    }
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

  const preferredQrSrc =
    !qrImgFailed && payment?.qrImageUrl
      ? payment.qrImageUrl
      : qrImageFromContent || payment?.qrImageUrl || undefined;

  const modal = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "relative z-10 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]",
              payment ? "max-w-2xl" : "max-w-md"
            )}
          >
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
                onClick={handleClose}
                className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
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
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                  {payment.amount === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <Check size={22} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-center space-y-1">
                        <div className={cn("text-sm font-semibold", portalHeading)}>{b.paymentPanel.freeTitle}</div>
                        <p className={cn("text-xs max-w-xs", portalSubtext)}>{b.paymentPanel.freeDesc}</p>
                      </div>
                      <div className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-center">
                        <div className={cn("text-[10px] uppercase tracking-wider opacity-55 mb-0.5", portalSubtext)}>
                          {b.paymentPanel.orderCode}
                        </div>
                        <div className={cn("text-xs font-mono font-semibold break-all", portalHeading)}>
                          {payment.orderCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleFreeActivation()}
                        disabled={activating}
                        className="w-full h-11 shimmer-button rounded-xl text-sm font-semibold text-white hr-cta-btn flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {activating ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {b.paymentPanel.activatingLabel}
                          </>
                        ) : (
                          b.paymentPanel.activateNowBtn
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={cn("text-sm font-semibold mb-3", portalHeading)}>{b.paymentPanel.title}</div>
                      <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,240px)_1fr] gap-3 sm:gap-4 sm:items-start">
                        <div className="flex flex-col items-center gap-2 sm:block">
                          {preferredQrSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={preferredQrSrc}
                              alt="SePay QR"
                              className="w-40 sm:w-full aspect-square object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-2"
                              onError={() => setQrImgFailed(true)}
                            />
                          ) : (
                            <div className="w-40 sm:w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3">
                              <div className={cn("text-[11px] mb-1", portalSubtext)}>QR content</div>
                              <div className={cn("break-all text-[11px]", portalHeading)}>
                                {payment.qrContent || b.paymentPanel.noQrData}
                              </div>
                            </div>
                          )}
                          {waiting && (
                            <div className={cn("text-xs text-center mt-2", portalHeading)}>
                              {b.paymentPanel.waitingWebhook}
                            </div>
                          )}

                          {/* Countdown chip */}
                          {secsLeft !== null ? (
                            <div
                              className={cn(
                                "flex items-center justify-center gap-2 mt-2 rounded-full px-4 py-2 select-none",
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
                          ) : (
                            b.paymentPanel.validityHint && (
                              <div className={cn("text-[11px] text-center px-1 mt-1", portalSubtext)}>
                                {b.paymentPanel.validityHint}
                              </div>
                            )
                          )}
                        </div>

                        <div className="space-y-2.5 min-w-0">
                          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-0 sm:space-y-2.5">
                            <div>
                              <div
                                className={cn(
                                  "text-[10px] uppercase tracking-wider font-medium opacity-55 mb-0.5",
                                  portalSubtext
                                )}
                              >
                                {b.paymentPanel.amount}
                              </div>
                              <div className="text-lg sm:text-xl font-extrabold text-primary">
                                {payment.amount.toLocaleString(locale)} {payment.currency}
                              </div>
                            </div>
                            <div>
                              <div
                                className={cn(
                                  "text-[10px] uppercase tracking-wider font-medium opacity-55 mb-0.5",
                                  portalSubtext
                                )}
                              >
                                {b.paymentPanel.orderCode}
                              </div>
                              <div
                                className={cn(
                                  "text-[11px] sm:text-[13px] font-semibold break-all font-mono leading-snug",
                                  portalHeading
                                )}
                              >
                                {payment.orderCode}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
                            <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                              <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>
                                {b.paymentPanel.bank}
                              </span>
                              <span className={cn("text-[12px] font-semibold text-right", portalHeading)}>
                                {payment.bankName || "--"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                              <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>
                                {b.paymentPanel.accountHolder}
                              </span>
                              <span className={cn("text-[12px] font-semibold text-right", portalHeading)}>
                                {payment.bankAccountName || "--"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                              <span className={cn("text-[11px] opacity-55 whitespace-nowrap shrink-0", portalSubtext)}>
                                {b.paymentPanel.expiresAt}
                              </span>
                              <span className={cn("text-[11px] tabular-nums", portalSubtext)}>
                                {payment.expiresAt
                                  ? new Date(payment.expiresAt).toLocaleString(locale)
                                  : "--"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-2">
                            <div className="min-w-0">
                              <div
                                className={cn(
                                  "text-[10px] uppercase tracking-wider font-medium opacity-55 mb-0.5",
                                  portalSubtext
                                )}
                              >
                                {b.paymentPanel.transferContent}
                              </div>
                              <div className={cn("text-[12px] font-semibold break-all leading-snug", portalHeading)}>
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
                              className="shrink-0 inline-flex items-center gap-1 text-primary text-xs font-medium hover:opacity-80 transition-opacity"
                            >
                              <Copy size={12} />
                              {b.paymentPanel.copyBtn}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

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

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
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
                ) : payment?.amount === 0 ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      setPayment(null);
                      setQrImgFailed(false);
                      finishingRef.current = false;
                    }}
                    className="flex-1 h-10 shimmer-button rounded-xl text-sm font-semibold text-white hr-cta-btn flex items-center justify-center gap-2"
                  >
                    {b.newOrderBtn}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return mounted ? createPortal(modal, document.body) : null;
}
