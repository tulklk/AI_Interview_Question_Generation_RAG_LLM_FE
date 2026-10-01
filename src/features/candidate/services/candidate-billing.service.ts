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
  getMyPaymentHistory,
  isPremiumPlanCode,
  type UpgradePaymentIntent,
  type MySubscription,
} from "@/features/subscription/services/subscription.service";
import { listCompletedSessions } from "@/features/candidate/services/practice-session.service";
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

/** 0 từ BE = unlimited → null trên UI */
function unlimitedOr(n: number): number | null {
  return n > 0 ? n : null;
}

function mapUsage(sub: MySubscription): CandidateBillingUsage {
  const premium = isPremiumPlanCode(sub.planCode);
  const practiceLimitFromApi =
    sub.practiceLimit > 0
      ? sub.practiceLimit
      : unlimitedOr(sub.limits.practicePerMonth);
  const historyLimit = unlimitedOr(sub.limits.maxSavedSessions);
  const fullAiLeft =
    premium || sub.fullAiFeedbackLimit === 0
      ? true
      : sub.fullAiFeedbackUsed < Math.max(1, sub.fullAiFeedbackLimit || sub.limits.fullAiFeedbackPerMonth || 1);

  return {
    practiceUsed: sub.practiceUsed ?? 0,
    practiceLimit: premium ? null : practiceLimitFromApi,
    // Free còn lượt full AI đầu kỳ → ADVANCED; hết → BASIC
    aiFeedbackLevel: premium || fullAiLeft ? "ADVANCED" : "BASIC",
    practiceHistoryLimit: premium ? null : historyLimit,
    practiceHistoryUsed: 0,
    canSendScorecardToHR: sub.entitlements.canPersistHrRecommendation,
  };
}

/** GET /api/me/subscription → map Candidate */
export async function getCandidateSubscription(): Promise<CandidateSubscription> {
  const sub = await getMySubscription();
  return mapSubscription(sub);
}

/** Usage từ subscription DTO (PracticeUsed / limits) — SCRUM-498 */
export async function getCandidateBillingUsage(): Promise<CandidateBillingUsage> {
  const sub = await getMySubscription();
  const usage = mapUsage(sub);
  try {
    // Số phiên COMPLETED thật — maxSavedSessions chỉ áp dụng cho phiên đã hoàn thành.
    const { totalCount } = await listCompletedSessions({ pageSize: 1 });
    usage.practiceHistoryUsed = totalCount;
  } catch {
    // giữ 0 nếu API lỗi — vẫn hiện đúng limit, chỉ thiếu số đã dùng
  }
  return usage;
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
