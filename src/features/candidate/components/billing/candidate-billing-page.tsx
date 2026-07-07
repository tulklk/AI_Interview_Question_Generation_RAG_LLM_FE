"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  CreditCard, Zap, Check, Lock, Unlock, Crown, Star,
  Receipt, Download, ExternalLink, AlertTriangle,
  RefreshCw, Sparkles, X, ChevronRight, Calendar,
  BarChart2, BookOpen, History, Send,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type {
  CandidateSubscription,
  CandidateBillingUsage,
  PaymentHistoryItem,
} from "@/features/candidate/types/billing";
import { useCandidateSubscription } from "@/features/candidate/context/candidate-subscription-context";
import {
  getCandidateSubscription,
  getCandidateBillingUsage,
  getCandidatePaymentHistory,
  upgradeToPremium,
  cancelSubscription,
} from "@/features/candidate/services/candidate-billing.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800", className)} />;
}

function BillingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  onClose: () => void;
  onDone: (sub: CandidateSubscription, use: CandidateBillingUsage, hist: PaymentHistoryItem[]) => void;
}

function UpgradeModal({ onClose, onDone }: UpgradeModalProps) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const b = t.jobseekerSettingsPage.billing;
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

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
      onDone(sub, use, hist);
    } catch {
      addToast("error", b.upgradeFailed);
    } finally {
      setLoading(false);
    }
  }

  const monthlyPrice = "$12.99";
  const yearlyPrice = "$99";

  const modal = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
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
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2.5", portalSubtext)}>{b.billingCycleLabel}</p>
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
                    {c === "MONTHLY" ? monthlyPrice : yearlyPrice}
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
                "flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold transition-colors",
                portalHeading,
                "hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              )}
            >
              {t.jobseekerSettingsPage.billing.cancelBtn.replace("Plan", "")}
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

  return mounted ? createPortal(modal, document.body) : null;
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  onClose: () => void;
  onDone: (sub: CandidateSubscription, use: CandidateBillingUsage) => void;
}

function CancelModal({ onClose, onDone }: CancelModalProps) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const b = t.jobseekerSettingsPage.billing;
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  async function handleCancel() {
    setLoading(true);
    try {
      await cancelSubscription();
      const [sub, use] = await Promise.all([getCandidateSubscription(), getCandidateBillingUsage()]);
      addToast("success", b.cancelSuccess);
      onDone(sub, use);
    } catch {
      addToast("error", b.cancelFailed);
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800"
      >
        <div className="px-6 pt-6 pb-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-500 dark:text-red-400" />
            </div>
            <h2 className={cn("text-[17px] font-bold", portalHeading)}>{b.cancelModalTitle}</h2>
          </div>
          <p className={cn("text-sm", portalSubtext)}>{b.cancelModalDesc}</p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-2">
            {b.cancelWarnings.map((w) => (
              <div key={w} className="flex items-center gap-2">
                <X size={12} className="text-red-500 dark:text-red-400 shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{w}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 shimmer-button rounded-xl text-sm font-semibold text-white hr-cta-btn flex items-center justify-center disabled:opacity-60"
            >
              {b.keepPremiumBtn}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 h-10 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  {b.cancellingLabel}
                </>
              ) : (
                b.cancelConfirmBtn
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function QuotaBar({ used, limit, color = "bg-primary" }: { used: number; limit: number; color?: string }) {
  const pct = Math.min((used / limit) * 100, 100);
  const danger = pct >= 80;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", danger ? "bg-amber-400" : color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className={cn("text-[11px] font-semibold shrink-0 tabular-nums", danger ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400")}>
        {used}/{limit}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CandidateBillingPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { addToast } = useToast();
  const { refreshSubscription } = useCandidateSubscription();
  const b = t.jobseekerSettingsPage.billing;

  const [subscription, setSubscription] = useState<CandidateSubscription | null>(null);
  const [usage, setUsage] = useState<CandidateBillingUsage | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sub, use, hist] = await Promise.all([
          getCandidateSubscription(),
          getCandidateBillingUsage(),
          getCandidatePaymentHistory(),
        ]);
        setSubscription(sub);
        setUsage(use);
        setHistory(hist);
      } catch {
        addToast("error", "Failed to load billing information.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <AiLoadingSpinner text={b.loading} />
      </div>
    );
  }

  const isPremium = subscription?.planType === "PREMIUM";

  // ── Quota items ──
  const quotaItems = usage ? [
    {
      icon: BookOpen,
      label: b.practiceAttemptsLabel,
      limited: !isPremium,
      used: usage.practiceUsed,
      limit: usage.practiceLimit,
    },
    {
      icon: Sparkles,
      label: b.aiFeedbackLabel,
      level: usage.aiFeedbackLevel === "ADVANCED" ? b.advancedLevel : b.basicLevel,
      isPremiumFeature: !isPremium,
    },
    {
      icon: BarChart2,
      label: b.questionAccessLabel,
      limited: !isPremium,
      used: usage.visibleQuestionsPerSet,
      perSet: true,
    },
    {
      icon: Send,
      label: b.scorecardLabel,
      locked: !usage.canSendScorecardToHR,
    },
  ] : [];

  return (
    <div className="space-y-5">

      {/* ── 1. Current Plan Card ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "rounded-xl border p-5 md:p-6 relative overflow-hidden",
          isPremium
            ? "border-primary/30 bg-linear-to-br from-violet-50/80 via-white to-white dark:from-violet-950/20 dark:via-gray-900 dark:to-gray-900"
            : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        )}
      >
        {isPremium && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full",
                isPremium
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}>
                {isPremium ? <Crown size={11} /> : <Star size={11} />}
                {isPremium ? b.premiumBadge : b.freeBadge}
              </span>
            </div>

            <h3 className={cn("text-lg font-bold mb-1", portalHeading)}>
              {isPremium ? b.premiumPlan : b.freePlan}
            </h3>
            <p className={cn("text-sm mb-4", portalSubtext)}>
              {isPremium ? b.premiumDesc : b.freeDesc}
            </p>

            {/* Plan meta — Premium only */}
            {isPremium && subscription && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {subscription.renewalDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className={portalSubtext}>{b.renewalLabel}:&nbsp;</span>
                    <span className={cn("font-semibold", portalHeading)}>{formatDate(subscription.renewalDate)}</span>
                  </div>
                )}
                {subscription.billingCycle && (
                  <div className="flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className={portalSubtext}>{b.cycleLabel}:&nbsp;</span>
                    <span className={cn("font-semibold", portalHeading)}>
                      {subscription.billingCycle === "MONTHLY" ? b.monthly : b.yearly}
                    </span>
                  </div>
                )}
                {subscription.price !== undefined && subscription.currency && (
                  <div className="flex items-center gap-1.5">
                    <CreditCard size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className={cn("font-semibold", portalHeading)}>
                      {formatPrice(subscription.price, subscription.currency)}
                      {subscription.billingCycle === "MONTHLY" ? b.perMonth : b.perYear}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Free: quota mini-grid */}
            {!isPremium && usage && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
                {[
                  { label: b.practiceAttemptsLabel, value: `${usage.practiceUsed}/${usage.practiceLimit}` },
                  { label: b.aiFeedbackLabel, value: b.basicLevel },
                  { label: b.questionAccessLabel, value: `${usage.visibleQuestionsPerSet}/set` },
                  { label: b.scorecardLabel, value: b.lockedStatus, locked: true },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3">
                    <p className={cn("text-[10px] font-medium mb-1 leading-tight", portalSubtext)}>{item.label}</p>
                    <p className={cn("text-sm font-bold", item.locked ? "text-gray-400 dark:text-gray-500" : portalHeading)}>
                      {item.locked && <Lock size={10} className="inline mr-1" />}
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {!isPremium ? (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="shimmer-button flex items-center justify-center gap-2 px-5 h-10 text-sm font-semibold text-white hr-cta-btn rounded-xl whitespace-nowrap"
              >
                <Crown size={14} />
                {b.upgradeBtn}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 h-9 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap",
                    portalHeading
                  )}
                >
                  <CreditCard size={13} />
                  {b.manageBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancel(true)}
                  className="flex items-center justify-center gap-2 px-4 h-9 text-sm font-semibold rounded-xl border border-red-200 dark:border-red-800/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap"
                >
                  {b.cancelBtn}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 2. Plan Comparison ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 md:p-6"
      >
        <h3 className={cn("text-base font-bold mb-4", portalHeading)}>{b.pricingTitle}</h3>
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Free */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-4">
            <div>
              <p className={cn("text-[11px] font-bold uppercase tracking-wide mb-1", portalSubtext)}>
                {b.freePlan}
              </p>
              <div className="flex items-end gap-1">
                <span className={cn("text-3xl font-extrabold", portalHeading)}>{b.freePrice}</span>
              </div>
            </div>
            <ul className="space-y-2 flex-1">
              {b.freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <X size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  <span className={cn("text-sm", portalSubtext)}>{f}</span>
                </li>
              ))}
            </ul>
            <div className={cn("text-xs font-semibold text-center py-2 rounded-lg bg-gray-50 dark:bg-gray-800", portalSubtext)}>
              {isPremium ? b.freePrice : b.currentPlanLabel}
            </div>
          </div>

          {/* Premium */}
          <div className="relative rounded-xl border-2 border-primary bg-linear-to-br from-violet-50/60 to-white dark:from-violet-950/20 dark:to-gray-900 p-5 flex flex-col gap-4">
            <span className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              {b.recommended}
            </span>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Crown size={13} className="text-primary" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  {b.premiumPlan}
                </p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-primary">$12.99</span>
                <span className={cn("text-sm mb-0.5", portalSubtext)}>{b.perMonth}</span>
              </div>
            </div>
            <ul className="space-y-2 flex-1">
              {b.premiumFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check size={12} className="text-primary shrink-0" />
                  <span className={cn("text-sm", portalHeading)}>{f}</span>
                </li>
              ))}
            </ul>
            {!isPremium ? (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="shimmer-button flex items-center justify-center gap-2 w-full h-9 text-sm font-semibold text-white hr-cta-btn rounded-lg"
              >
                {b.upgradeNow}
                <ChevronRight size={13} />
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                <Check size={12} />
                {b.currentPlanLabel}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 3. Usage & Quota ────────────────────────────────────────────────── */}
      {usage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 md:p-6"
        >
          <h3 className={cn("text-base font-bold mb-4", portalHeading)}>{b.quotaTitle}</h3>
          <div className="space-y-3.5">
            {quotaItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <item.icon size={14} className={cn(item.locked ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn("text-sm font-medium", portalHeading)}>{item.label}</span>
                    {!isPremium && item.limited && typeof item.used === "number" && typeof item.limit === "number" ? (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        {item.used}/{item.limit}{item.perSet ? ` ${b.perSet}` : ""}
                      </span>
                    ) : item.level ? (
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-md",
                        item.isPremiumFeature
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          : "bg-primary/10 text-primary"
                      )}>
                        {item.level}
                      </span>
                    ) : item.locked !== undefined ? (
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1",
                        item.locked
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {item.locked ? <Lock size={9} /> : <Unlock size={9} />}
                        {item.locked ? b.lockedStatus : b.unlockedStatus}
                      </span>
                    ) : null}
                    {isPremium && item.limited !== undefined && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                        {b.unlimitedLabel}
                      </span>
                    )}
                  </div>
                  {!isPremium && item.limited && typeof item.used === "number" && typeof item.limit === "number" ? (
                    <QuotaBar used={item.used} limit={item.limit} />
                  ) : (
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full",
                        isPremium ? "bg-primary w-full" : item.locked ? "bg-gray-200 dark:bg-gray-700 w-0" : "bg-gray-300 dark:bg-gray-600 w-1/3"
                      )} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isPremium && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
              <p className={cn("text-xs", portalSubtext)}>{b.upgradeHint}</p>
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {b.upgradeBtn}
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── 4. Payment History ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-gray-400 dark:text-gray-500" />
            <h3 className={cn("text-sm font-bold", portalHeading)}>{b.historyTitle}</h3>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Receipt size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-center">
              <p className={cn("text-sm font-semibold", portalHeading)}>{b.noHistory}</p>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>{b.noHistorySubtext}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {[b.colInvoice, b.colPlan, b.colAmount, b.colStatus, b.colDate, b.colActions].map((col) => (
                    <th key={col} className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide", portalSubtext)}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {history.map((item) => (
                  <tr key={item.invoiceId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={cn("px-4 py-3 font-mono text-xs", portalSubtext)}>{item.invoiceId}</td>
                    <td className={cn("px-4 py-3 font-medium", portalHeading)}>{item.planName}</td>
                    <td className={cn("px-4 py-3 font-semibold tabular-nums", portalHeading)}>
                      {formatPrice(item.amount, item.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        item.status === "PAID" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
                        item.status === "PENDING" && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
                        item.status === "FAILED" && "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.status === "PAID" && "bg-emerald-500",
                          item.status === "PENDING" && "bg-amber-500",
                          item.status === "FAILED" && "bg-red-500",
                        )} />
                        {item.status === "PAID" ? b.statusPaid : item.status === "PENDING" ? b.statusPending : b.statusFailed}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 tabular-nums", portalSubtext)}>
                      {formatDate(item.paymentDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {item.receiptUrl && (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors", portalSubtext)}
                          >
                            <ExternalLink size={11} />
                            {b.viewBtn}
                          </a>
                        )}
                        <button
                          type="button"
                          className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors", portalSubtext)}
                        >
                          <Download size={11} />
                          {b.downloadBtn}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── 5. Billing Info ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.22 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 md:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-gray-400 dark:text-gray-500" />
            <h3 className={cn("text-sm font-bold", portalHeading)}>{b.billingInfoTitle}</h3>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: b.billingName, value: user?.fullName || "—" },
            { label: b.billingEmail, value: user?.email || "—" },
            { label: b.billingPayment, value: b.noPaymentMethod },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <span className={cn("text-sm", portalSubtext)}>{row.label}</span>
              <span className={cn("text-sm font-medium", portalHeading)}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
              portalHeading
            )}
          >
            {b.updateBillingBtn}
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
              portalHeading
            )}
          >
            <CreditCard size={11} />
            {b.changePaymentBtn}
          </button>
        </div>
      </motion.div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onDone={(sub, use, hist) => {
            setSubscription(sub);
            setUsage(use);
            setHistory(hist);
            setShowUpgrade(false);
            void refreshSubscription();
          }}
        />
      )}
      {showCancel && (
        <CancelModal
          onClose={() => setShowCancel(false)}
          onDone={(sub, use) => {
            setSubscription(sub);
            setUsage(use);
            setShowCancel(false);
            void refreshSubscription();
          }}
        />
      )}
    </div>
  );
}
