import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import {
  premiumSubscription,
  freeSubscriptionReady,
  renderStudio,
  getMockedGetMySubscription,
} from "./studio-test-utils";
import { HrBillingSubscription } from "@/features/settings/components/hr-billing-subscription";

// Grounded in src/features/settings/components/hr-billing-subscription.tsx —
// HR's plan/billing tab (current plan, plan comparison, payment history,
// cancel-to-Free flow). No prior automated coverage existed. Renders
// <HrBillingSubscription> directly via studio-test-utils.tsx's renderStudio
// (HrSubscriptionProvider), which already mocks
// @/features/subscription/services/subscription.service at the module
// boundary (including listSubscriptionPlans) — this file additionally mocks
// @/features/hr/services/hr-billing.service for payment history.
//
// NOTE 1: "Downgrade to Free" text appears in 3 places once the cancel modal
// is open (the Free plan card's own CTA, the modal's own <h2> title, and the
// modal's confirm button) — queries below scope to the heading role to avoid
// ambiguity, same gotcha as the invitations/HR-history files.
// NOTE 2: this component renders a fairly large plan-comparison grid; every
// test here gets an explicit 15000ms timeout since a plain findByText's
// 10000ms inner wait can otherwise still lose to Vitest's 5000ms per-test
// default under load (same gotcha as hr-dashboard.test.tsx / invitations.test.tsx).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/hr/services/hr-billing.service", () => ({
  getHrPaymentHistory: vi.fn(),
}));

import * as hrBillingApiTyped from "@/features/hr/services/hr-billing.service";
const hrBillingApi = hrBillingApiTyped as unknown as { getHrPaymentHistory: ReturnType<typeof vi.fn> };

async function getMockedListSubscriptionPlans() {
  const mod = await import("@/features/subscription/services/subscription.service");
  return vi.mocked(mod.listSubscriptionPlans);
}

// The current-plan banner ("You are on Free") and the plan-comparison card's
// own title both render the plan name as bare text, so a singular
// findByText/getByText throws "Found multiple elements" — same dual-render
// gotcha as hr-dashboard.test.tsx / invitations.test.tsx.
async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(async () => {
  hrBillingApi.getHrPaymentHistory.mockReset();
  hrBillingApi.getHrPaymentHistory.mockResolvedValue([]);
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedListSubscriptionPlans()).mockReset();
  (await getMockedListSubscriptionPlans()).mockResolvedValue([]);
});

describe("HR Billing — current plan", () => {
  test(
    "BILL-1: shows the Free plan name for a Free subscriber",
    async () => {
      (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
      renderStudio(<HrBillingSubscription />);

      expect(await findFirstText("Free")).toBeInTheDocument();
    },
    15000
  );

  test(
    "BILL-2: shows the Premium plan name for a Premium subscriber",
    async () => {
      (await getMockedGetMySubscription()).mockResolvedValue(premiumSubscription() as never);
      renderStudio(<HrBillingSubscription />);

      expect(await findFirstText("Premium")).toBeInTheDocument();
    },
    15000
  );
});

describe("HR Billing — payment history", () => {
  test(
    "BILL-3: a Free subscriber (no payment history) sees no invoice rows",
    async () => {
      (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
      hrBillingApi.getHrPaymentHistory.mockResolvedValue([]);
      renderStudio(<HrBillingSubscription />);

      await findFirstText("Free");
      expect(screen.queryByText("HR-2026-01-01")).not.toBeInTheDocument();
    },
    15000
  );

  test(
    "BILL-4: a Premium subscriber's payment history shows their invoice",
    async () => {
      (await getMockedGetMySubscription()).mockResolvedValue(premiumSubscription() as never);
      hrBillingApi.getHrPaymentHistory.mockResolvedValue([
        {
          invoiceId: "HR-2026-01-01",
          planName: "Premium",
          amount: 499000,
          currency: "VND",
          status: "PAID",
          paymentDate: "2026-01-01T00:00:00Z",
        },
      ] as never);
      renderStudio(<HrBillingSubscription />);

      expect(await screen.findByText("HR-2026-01-01", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});

describe("HR Billing — cancel to Free", () => {
  test(
    "BILL-5: clicking Downgrade to Free opens a confirm dialog without cancelling immediately",
    async () => {
      (await getMockedGetMySubscription()).mockResolvedValue(premiumSubscription() as never);
      const user = userEvent.setup();
      renderStudio(<HrBillingSubscription />);
      await findFirstText("Premium");

      const downgradeButtons = await screen.findAllByRole("button", { name: "Downgrade to Free" }, { timeout: 10000 });
      await user.click(downgradeButtons[0]);

      expect(await screen.findByRole("heading", { name: "Downgrade to Free" }, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.getByText("Keep Premium")).toBeInTheDocument();
    },
    15000
  );

  test(
    "BILL-6: Keep Premium closes the dialog without cancelling the subscription",
    async () => {
      (await getMockedGetMySubscription()).mockResolvedValue(premiumSubscription() as never);
      const user = userEvent.setup();
      renderStudio(<HrBillingSubscription />);
      await findFirstText("Premium");

      const downgradeButtons = await screen.findAllByRole("button", { name: "Downgrade to Free" }, { timeout: 10000 });
      await user.click(downgradeButtons[0]);
      await screen.findByRole("heading", { name: "Downgrade to Free" }, { timeout: 10000 });

      await user.click(screen.getByRole("button", { name: "Keep Premium" }));

      // the modal exits via a framer-motion AnimatePresence animation, so the
      // heading stays mounted briefly after the click — wait for it to be removed
      // rather than asserting synchronously.
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: "Downgrade to Free" })).not.toBeInTheDocument()
      );
    },
    15000
  );
});
