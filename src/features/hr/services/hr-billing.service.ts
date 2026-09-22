import type { PaymentHistoryItem } from "@/features/candidate/types/billing";
import { getMyPaymentHistory } from "@/features/subscription/services/subscription.service";

/**
 * Lịch sử thanh toán HR — GET /api/me/subscription/payments (SubscriptionTransaction thật).
 */
export async function getHrPaymentHistory(): Promise<PaymentHistoryItem[]> {
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
