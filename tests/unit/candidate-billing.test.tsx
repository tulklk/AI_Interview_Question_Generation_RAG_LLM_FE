import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { candidateBillingServiceMockFactory } from "./candidate-service-mocks";
import { renderCandidate } from "./candidate-test-utils";
import { CandidateBillingPage } from "@/features/candidate/components/billing/candidate-billing-page";
import type { CandidateSubscription, CandidateBillingUsage } from "@/features/candidate/types/billing";

// Grounded in src/features/candidate/components/billing/candidate-billing-page.tsx
// — the Candidate "Billing" tab (current plan, plan comparison, usage/quota,
// payment history, cancel-to-Free flow). No prior automated coverage existed.
// Renders <CandidateBillingPage> via candidate-test-utils.tsx's renderCandidate
// (CandidateSubscriptionProvider — reads the SAME mocked candidate-billing.service
// module as this component's own data fetch, so one mock covers both consumers).
//
// NOTE: the current-plan badge, the current-plan title, and the plan-comparison
// card's own label all render the same bare plan-name text ("Free Plan" /
// "Premium") simultaneously — a singular findByText throws "Found multiple
// elements", same dual-render gotcha as hr-billing.test.tsx. Queries below use
// findFirstText for those.
//
// UpgradeModal is mocked to a lightweight placeholder — its own SePay
// payment/polling flow is out of scope here (see ui-upgrade-modal.test.tsx for
// its dedicated coverage) and this file only needs to confirm the billing page
// opens it.

vi.mock("@/features/candidate/services/candidate-billing.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.candidateBillingServiceMockFactory();
});

vi.mock("@/features/subscription/services/subscription.service", () => ({
  listSubscriptionPlans: vi.fn(),
  isPremiumPlanCode: (code: string) => code.toUpperCase().includes("PREMIUM"),
}));

vi.mock("@/features/candidate/components/billing/upgrade-modal", () => ({
  UpgradeModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="upgrade-modal-stub">
      <button type="button" onClick={onClose}>Close upgrade stub</button>
    </div>
  ),
}));

import * as candidateBillingApiTyped from "@/features/candidate/services/candidate-billing.service";
import * as subscriptionApiTyped from "@/features/subscription/services/subscription.service";

const candidateBillingApi = candidateBillingApiTyped as unknown as ReturnType<typeof candidateBillingServiceMockFactory>;
const subscriptionApi = subscriptionApiTyped as unknown as { listSubscriptionPlans: ReturnType<typeof vi.fn> };

function freeUsage(overrides: Partial<CandidateBillingUsage> = {}): CandidateBillingUsage {
  return {
    practiceUsed: 3,
    practiceLimit: 5,
    visibleQuestionsPerSet: 3,
    aiFeedbackLevel: "BASIC",
    practiceHistoryLimit: 10,
    canSendScorecardToHR: false,
    ...overrides,
  };
}

function premiumUsage(overrides: Partial<CandidateBillingUsage> = {}): CandidateBillingUsage {
  return {
    practiceUsed: 42,
    practiceLimit: null,
    visibleQuestionsPerSet: null,
    aiFeedbackLevel: "ADVANCED",
    practiceHistoryLimit: null,
    canSendScorecardToHR: true,
    ...overrides,
  };
}

function freeSub(overrides: Partial<CandidateSubscription> = {}): CandidateSubscription {
  return { planType: "FREE", status: "ACTIVE", ...overrides };
}

function premiumSub(overrides: Partial<CandidateSubscription> = {}): CandidateSubscription {
  return {
    planType: "PREMIUM",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    price: 199000,
    currency: "VND",
    renewalDate: "2026-09-15T00:00:00Z",
    ...overrides,
  };
}

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(() => {
  candidateBillingApi.getCandidateSubscription.mockReset();
  candidateBillingApi.getCandidateBillingUsage.mockReset();
  candidateBillingApi.getCandidatePaymentHistory.mockReset();
  candidateBillingApi.cancelSubscription.mockReset();
  candidateBillingApi.getCandidatePaymentHistory.mockResolvedValue([]);
  subscriptionApi.listSubscriptionPlans.mockReset();
  subscriptionApi.listSubscriptionPlans.mockResolvedValue([]);
});

describe("Candidate Billing — current plan", () => {
  test(
    "CBILL-1: a Free subscriber sees the Free plan and their practice-attempt usage",
    async () => {
      candidateBillingApi.getCandidateSubscription.mockResolvedValue(freeSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(freeUsage());
      renderCandidate(<CandidateBillingPage />);

      expect(await findFirstText("Free Plan")).toBeInTheDocument();
      expect(await findFirstText("3/5")).toBeInTheDocument();
    },
    15000
  );

  test(
    "CBILL-2: a Premium subscriber sees the Premium plan and their renewal date",
    async () => {
      candidateBillingApi.getCandidateSubscription.mockResolvedValue(premiumSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(premiumUsage());
      renderCandidate(<CandidateBillingPage />);

      expect(await findFirstText("Premium")).toBeInTheDocument();
      const expectedDate = new Date("2026-09-15T00:00:00Z").toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      expect(await screen.findByText(expectedDate, {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});

describe("Candidate Billing — payment history", () => {
  test(
    "CBILL-3: no payment history shows the empty state",
    async () => {
      candidateBillingApi.getCandidateSubscription.mockResolvedValue(freeSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(freeUsage());
      candidateBillingApi.getCandidatePaymentHistory.mockResolvedValue([]);
      renderCandidate(<CandidateBillingPage />);

      expect(await screen.findByText("No payment history yet.", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );

  test(
    "CBILL-4: a past payment shows its invoice row",
    async () => {
      candidateBillingApi.getCandidateSubscription.mockResolvedValue(premiumSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(premiumUsage());
      candidateBillingApi.getCandidatePaymentHistory.mockResolvedValue([
        {
          invoiceId: "CAND-2026-01-01",
          planName: "Premium",
          amount: 199000,
          currency: "VND",
          status: "PAID",
          paymentDate: "2026-01-01T00:00:00Z",
        },
      ]);
      renderCandidate(<CandidateBillingPage />);

      expect(await screen.findByText("CAND-2026-01-01", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});

describe("Candidate Billing — upgrade and cancel", () => {
  test(
    "CBILL-5: a Free subscriber clicking Upgrade to Premium opens the upgrade modal",
    async () => {
      candidateBillingApi.getCandidateSubscription.mockResolvedValue(freeSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(freeUsage());
      const user = userEvent.setup();
      renderCandidate(<CandidateBillingPage />);
      await findFirstText("Free Plan");

      const upgradeButtons = await screen.findAllByRole("button", { name: "Upgrade to Premium" }, { timeout: 10000 });
      await user.click(upgradeButtons[0]);

      expect(await screen.findByRole("dialog", { name: "upgrade-modal-stub" })).toBeInTheDocument();
    },
    15000
  );

  test(
    "CBILL-6: a Premium subscriber can cancel — Cancel Plan opens the confirm dialog, confirming calls cancelSubscription and reverts the plan card to Free",
    async () => {
      candidateBillingApi.getCandidateSubscription.mockResolvedValueOnce(premiumSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(premiumUsage());
      candidateBillingApi.cancelSubscription.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderCandidate(<CandidateBillingPage />);
      await findFirstText("Premium");

      await user.click(screen.getByRole("button", { name: "Cancel Plan" }));
      expect(await screen.findByRole("heading", { name: "Cancel Subscription" }, { timeout: 10000 })).toBeInTheDocument();
      expect(candidateBillingApi.cancelSubscription).not.toHaveBeenCalled();

      candidateBillingApi.getCandidateSubscription.mockResolvedValue(freeSub());
      candidateBillingApi.getCandidateBillingUsage.mockResolvedValue(freeUsage());
      await user.click(screen.getByRole("button", { name: "Cancel Subscription" }));

      await waitFor(() => expect(candidateBillingApi.cancelSubscription).toHaveBeenCalled());
      expect(await findFirstText("Free Plan")).toBeInTheDocument();
    },
    15000
  );
});
