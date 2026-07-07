import type {
  CandidateSubscription,
  CandidateBillingUsage,
  PaymentHistoryItem,
  BillingInfo,
} from "@/features/candidate/types/billing";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock state (mutated by upgrade/cancel to simulate persistence) ───────────
// TODO: Remove all mock data once real API endpoints are available.

let mockSubscription: CandidateSubscription = {
  planType: "FREE",
  status: "ACTIVE",
};

let mockUsage: CandidateBillingUsage = {
  practiceUsed: 3,
  practiceLimit: 5,
  visibleQuestionsPerSet: 3,
  aiFeedbackLevel: "BASIC",
  practiceHistoryLimit: 10,
  canSendScorecardToHR: false,
};

const mockPaymentHistory: PaymentHistoryItem[] = [];

const mockBillingInfo: BillingInfo = {
  fullName: "",
  email: "",
  country: "Vietnam",
  paymentMethod: undefined,
  cardLast4: undefined,
};

// ── Service functions ────────────────────────────────────────────────────────

/** TODO: GET /api/candidate/billing/subscription */
export async function getCandidateSubscription(): Promise<CandidateSubscription> {
  await delay(500);
  return { ...mockSubscription };
}

/** TODO: GET /api/candidate/billing/usage */
export async function getCandidateBillingUsage(): Promise<CandidateBillingUsage> {
  await delay(400);
  return { ...mockUsage };
}

/** TODO: GET /api/candidate/billing/payments */
export async function getCandidatePaymentHistory(): Promise<PaymentHistoryItem[]> {
  await delay(400);
  return [...mockPaymentHistory];
}

/** TODO: GET /api/candidate/billing/info */
export async function getCandidateBillingInfo(): Promise<BillingInfo> {
  await delay(300);
  return { ...mockBillingInfo };
}

/** TODO: POST /api/candidate/billing/upgrade */
export async function upgradeToPremium(payload: {
  billingCycle: "MONTHLY" | "YEARLY";
}): Promise<void> {
  await delay(1500);

  const price = payload.billingCycle === "MONTHLY" ? 12.99 : 99;
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + (payload.billingCycle === "MONTHLY" ? 1 : 12));

  mockSubscription = {
    planType: "PREMIUM",
    status: "ACTIVE",
    billingCycle: payload.billingCycle,
    price,
    currency: "USD",
    renewalDate: renewal.toISOString(),
    startedAt: new Date().toISOString(),
    cancelledAt: null,
  };

  mockUsage = {
    practiceUsed: mockUsage.practiceUsed,
    practiceLimit: null,
    visibleQuestionsPerSet: null,
    aiFeedbackLevel: "ADVANCED",
    practiceHistoryLimit: null,
    canSendScorecardToHR: true,
  };

  mockPaymentHistory.unshift({
    invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
    planName: "Premium Plan",
    amount: price,
    currency: "USD",
    status: "PAID",
    paymentDate: new Date().toISOString(),
  });
}

/** TODO: POST /api/candidate/billing/cancel */
export async function cancelSubscription(): Promise<void> {
  await delay(1200);

  mockSubscription = {
    planType: "FREE",
    status: "CANCELLED",
    cancelledAt: new Date().toISOString(),
  };

  mockUsage = {
    practiceUsed: mockUsage.practiceUsed,
    practiceLimit: 5,
    visibleQuestionsPerSet: 3,
    aiFeedbackLevel: "BASIC",
    practiceHistoryLimit: 10,
    canSendScorecardToHR: false,
  };
}

/** TODO: PUT /api/candidate/billing/payment-method */
export async function updatePaymentMethod(_payload: { cardToken: string }): Promise<void> {
  await delay(800);
  // TODO: update mock billing info with new payment method
}
