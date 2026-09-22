import type {
  CandidateSubscription,
  CandidateBillingUsage,
  PaymentHistoryItem,
  BillingInfo,
} from "@/features/candidate/types/billing";
import {
  cancelSubscriptionSandbox,
  createUpgradePaymentOrder,
  getUpgradePaymentStatus,
  getMySubscription,
  getMyUsage,
  getMyPaymentHistory,
  isPremiumPlanCode,
  type UpgradePaymentIntent,
  type MySubscription,
} from "@/features/subscription/services/subscription.service";
import { getAccessToken } from "@/core/auth/token.service";

function mapSubscription(sub: MySubscription): CandidateSubscription {
  const premium = isPremiumPlanCode(sub.planCode);
  return {
    planType: premium ? "PREMIUM" : "FREE",
    status: sub.status?.toUpperCase() === "CANCELLED" ? "CANCELLED" : "ACTIVE",
    billingCycle: "MONTHLY",
    price: sub.priceMonthly,
    currency: sub.currency || "VND",
    renewalDate: sub.periodEnd,
    startedAt: sub.periodStart,
    cancelledAt: sub.cancelAtPeriodEnd ? sub.periodEnd : null,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
  };
}

function mapUsage(sub: MySubscription): CandidateBillingUsage {
  const premium = isPremiumPlanCode(sub.planCode);
  const feedbackUsed =
    // usage riêng lấy qua getMyUsage nếu cần; tạm map từ generate không đúng —
    // Candidate feedback đếm UsageType CandidateFeedback
    0;
  return {
    practiceUsed: feedbackUsed,
    practiceLimit: premium ? null : 5,
    visibleQuestionsPerSet: premium ? null : Math.max(1, Math.ceil(30 * (sub.limits.freeVisiblePercent / 100))),
    aiFeedbackLevel: premium ? "ADVANCED" : "BASIC",
    practiceHistoryLimit: premium ? null : 10,
    canSendScorecardToHR: sub.entitlements.canPersistHrRecommendation,
  };
}

async function enrichUsage(sub: MySubscription): Promise<CandidateBillingUsage> {
  const base = mapUsage(sub);
  try {
    const rows = await getMyUsage();
    const feedback = rows.find((r) => r.usageType === "CandidateFeedback");
    if (feedback) {
      base.practiceUsed = feedback.usedCount;
    }
  } catch {
    // giữ base
  }
  return base;
}

/** GET /api/me/subscription → map Candidate */
export async function getCandidateSubscription(): Promise<CandidateSubscription> {
  const sub = await getMySubscription();
  return mapSubscription(sub);
}

/** Usage từ subscription + usage counters */
export async function getCandidateBillingUsage(): Promise<CandidateBillingUsage> {
  const sub = await getMySubscription();
  return enrichUsage(sub);
}

/** GET /api/me/subscription/payments — lịch sử SubscriptionTransaction thật */
export async function getCandidatePaymentHistory(): Promise<PaymentHistoryItem[]> {
  try {
    const rows = await getMyPaymentHistory(50);
    return rows.map((r) => ({
      invoiceId: r.invoiceId,
      planName: r.planName,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      paymentDate: r.paymentDate,
      receiptUrl: r.receiptUrl,
    }));
  } catch {
    return [];
  }
}

export async function getCandidateBillingInfo(): Promise<BillingInfo> {
  return {
    fullName: "",
    email: "",
    country: "Vietnam",
    paymentMethod: getAccessToken() ? "Sandbox" : undefined,
  };
}

/** POST /api/me/subscription/upgrade */
export async function upgradeToPremium(): Promise<UpgradePaymentIntent> {
  return createUpgradePaymentOrder();
}

/** GET /api/me/subscription/upgrade/{orderCode} */
export async function getUpgradeOrderStatus(orderCode: string): Promise<UpgradePaymentIntent> {
  return getUpgradePaymentStatus(orderCode);
}

/** POST /api/me/subscription/cancel */
export async function cancelSubscription(): Promise<void> {
  await cancelSubscriptionSandbox();
}

export async function updatePaymentMethod(_payload: { cardToken: string }): Promise<void> {
  // Sandbox — chưa có payment method thật
}
