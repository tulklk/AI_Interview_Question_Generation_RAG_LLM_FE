import {
  getMySubscription,
  isPremiumPlanCode,
} from "@/features/subscription/services/subscription.service";
import type { PaymentHistoryItem } from "@/features/candidate/types/billing";

/** Derives payment history from the current subscription. */
export async function getHrPaymentHistory(): Promise<PaymentHistoryItem[]> {
  try {
    const sub = await getMySubscription();
    if (!isPremiumPlanCode(sub.planCode) || sub.priceMonthly <= 0) return [];
    return [
      {
        invoiceId: `HR-${sub.periodStart.slice(0, 10)}`,
        planName: sub.planName,
        amount: sub.priceMonthly,
        currency: sub.currency || "VND",
        status: "PAID",
        paymentDate: sub.periodStart,
      },
    ];
  } catch {
    return [];
  }
}
