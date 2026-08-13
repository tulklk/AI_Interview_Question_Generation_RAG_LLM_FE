import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { candidateBillingServiceMockFactory } from "./candidate-service-mocks";
import { UpgradeModal } from "@/features/candidate/components/billing/upgrade-modal";
import type { CandidateSubscription, CandidateBillingUsage } from "@/features/candidate/types/billing";
import type { UpgradePaymentIntent } from "@/features/subscription/services/subscription.service";

// Grounded in src/features/candidate/components/billing/upgrade-modal.tsx.
// candidate-billing.test.tsx stubs this component entirely (its own header
// comment says so) — this file is UpgradeModal's own dedicated coverage,
// focused on the P1 finishPaid retry-on-failure fix: onDone is
// candidate-billing-page.tsx's AND practice-session.tsx's only path to a
// fresh subscription/usage/history after a successful payment, so a dropped
// fetch there must not silently leave premium features looking locked.
//
// subscription-payment-hub.ts's createSubscriptionPaymentHubConnection() is
// NOT mocked — in jsdom (no NEXT_PUBLIC_API_BASE_URL, no real WebSocket
// transport) it genuinely fails to construct a connection and returns null
// per its own try/catch fix, so every test here exercises the exact
// poll-only fallback path production falls back to when SignalR is
// unavailable — not a simulated stand-in for it.

vi.mock("@/features/candidate/services/candidate-billing.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.candidateBillingServiceMockFactory();
});

vi.mock("@/features/subscription/services/subscription.service", () => ({
  listSubscriptionPlans: vi.fn().mockResolvedValue([]),
  isPremiumPlanCode: (code: string) => code.toUpperCase().includes("PREMIUM"),
}));

import * as candidateBillingApiTyped from "@/features/candidate/services/candidate-billing.service";
const candidateBillingApi = candidateBillingApiTyped as unknown as ReturnType<typeof candidateBillingServiceMockFactory>;

function paymentIntent(overrides: Partial<UpgradePaymentIntent> = {}): UpgradePaymentIntent {
  return {
    orderCode: "ORDER-1",
    provider: "SePay",
    amount: 199000,
    currency: "VND",
    status: "Pending",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    qrContent: "qr-content",
    transferContent: "TRANSFER-1",
    ...overrides,
  };
}

function premiumSub(): CandidateSubscription {
  return { planType: "PREMIUM", status: "ACTIVE" };
}

function premiumUsage(): CandidateBillingUsage {
  return {
    practiceUsed: 0,
    practiceLimit: null,
    visibleQuestionsPerSet: null,
    aiFeedbackLevel: "ADVANCED",
    practiceHistoryLimit: null,
    canSendScorecardToHR: true,
  };
}

beforeEach(() => {
  Object.values(candidateBillingApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
});

describe("UpgradeModal — finishPaid retry-on-failure", () => {
  test(
    "UPM-1: once the background poll detects the order is Paid, finishPaid retries the post-payment refresh on transient failure and still calls onDone once it succeeds",
    async () => {
      candidateBillingApi.upgradeToPremium.mockResolvedValue(paymentIntent());
      candidateBillingApi.getUpgradeOrderStatus.mockResolvedValue(paymentIntent({ status: "Paid" }));
      candidateBillingApi.getCandidateSubscription
        .mockRejectedValueOnce(new Error("network"))
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue(premiumSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(premiumUsage());
      candidateBillingApi.getCandidatePaymentHistory.mockResolvedValue([]);

      const onDone = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<UpgradeModal onClose={onClose} onDone={onDone} />);

      await user.click(await screen.findByRole("button", { name: "Create payment order" }, { timeout: 10000 }));
      expect(await screen.findByText("ORDER-1", {}, { timeout: 10000 })).toBeInTheDocument();

      await waitFor(
        () =>
          expect(onDone).toHaveBeenCalledWith({
            subscription: premiumSub(),
            usage: premiumUsage(),
            history: [],
          }),
        { timeout: 10000 }
      );
      expect(candidateBillingApi.getCandidateSubscription).toHaveBeenCalledTimes(3);
    },
    15000
  );

  test(
    "UPM-2: finishPaid gives up quietly after 3 straight failures — the success toast/close already happened for the confirmed payment, so onDone just never fires instead of crashing",
    async () => {
      candidateBillingApi.upgradeToPremium.mockResolvedValue(paymentIntent());
      candidateBillingApi.getUpgradeOrderStatus.mockResolvedValue(paymentIntent({ status: "Paid" }));
      candidateBillingApi.getCandidateSubscription.mockRejectedValue(new Error("network"));
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(premiumUsage());
      candidateBillingApi.getCandidatePaymentHistory.mockResolvedValue([]);

      const onDone = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<UpgradeModal onClose={onClose} onDone={onDone} />);

      await user.click(await screen.findByRole("button", { name: "Create payment order" }, { timeout: 10000 }));
      expect(await screen.findByText("ORDER-1", {}, { timeout: 10000 })).toBeInTheDocument();

      await waitFor(
        () => expect(candidateBillingApi.getCandidateSubscription).toHaveBeenCalledTimes(3),
        { timeout: 10000 }
      );
      expect(onDone).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    },
    15000
  );
});
