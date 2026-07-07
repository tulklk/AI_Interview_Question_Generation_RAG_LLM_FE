export type CandidatePlanType = "FREE" | "PREMIUM";

export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING";

export interface CandidateSubscription {
  planType: CandidatePlanType;
  status: SubscriptionStatus;
  billingCycle?: "MONTHLY" | "YEARLY";
  price?: number;
  currency?: string;
  renewalDate?: string;
  startedAt?: string;
  cancelledAt?: string | null;
}

export interface CandidateBillingUsage {
  practiceUsed: number;
  practiceLimit: number | null;
  visibleQuestionsPerSet: number | null;
  aiFeedbackLevel: "BASIC" | "ADVANCED";
  practiceHistoryLimit: number | null;
  canSendScorecardToHR: boolean;
}

export interface PaymentHistoryItem {
  invoiceId: string;
  planName: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED";
  paymentDate: string;
  receiptUrl?: string;
}

export interface BillingInfo {
  fullName: string;
  email: string;
  country?: string;
  paymentMethod?: string;
  cardLast4?: string;
  nextBillingDate?: string;
}
