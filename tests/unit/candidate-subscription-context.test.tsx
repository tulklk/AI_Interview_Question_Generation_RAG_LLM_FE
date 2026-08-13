import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { candidateBillingServiceMockFactory } from "./candidate-service-mocks";
import {
  CandidateSubscriptionProvider,
  useCandidateSubscription,
} from "@/features/candidate/context/candidate-subscription-context";
import { useUser } from "@/features/auth/context/user-context";
import type { CurrentUser } from "@/shared/types/user";

// Grounded in src/features/candidate/context/candidate-subscription-context.tsx
// — the P0 fix for a "shared/kiosk browser" bug: the plan cache used to be
// read/written with no user scoping, so on a shared browser a Premium user's
// cached plan would be briefly applied (before the real API call corrects it)
// to the NEXT user who logs in on the same browser — including triggering a
// false "Premium revoked" dialog for someone who never had Premium. The fix
// scopes the cache to the exact user id it was written for (readCachedPlan /
// PLAN_CACHE_USER_KEY). No dedicated test exercised this before this file —
// only indirectly, by every other candidate test rendering the provider.

vi.mock("@/features/candidate/services/candidate-billing.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.candidateBillingServiceMockFactory();
});

vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
}));

import * as candidateBillingApiTyped from "@/features/candidate/services/candidate-billing.service";
import * as userServiceTyped from "@/features/auth/services/user.service";

const candidateBillingApi = candidateBillingApiTyped as unknown as ReturnType<typeof candidateBillingServiceMockFactory>;
const userService = userServiceTyped as unknown as { getCurrentUser: ReturnType<typeof vi.fn> };

const PLAN_CACHE_KEY = "hiregena-candidate-plan";
const PLAN_CACHE_USER_KEY = "hiregena-candidate-plan-user";

function user(id: string): CurrentUser {
  return { id, fullName: `User ${id}`, email: `${id}@example.com` };
}

function Probe() {
  const { planType } = useCandidateSubscription();
  const { user: current, loading } = useUser();
  return (
    <div data-testid="probe">
      {loading ? "loading-user" : `user:${current?.id ?? "none"} plan:${planType}`}
    </div>
  );
}

function renderProbe() {
  return renderWithProviders(
    <CandidateSubscriptionProvider>
      <Probe />
    </CandidateSubscriptionProvider>
  );
}

beforeEach(() => {
  localStorage.setItem("interviewai_auth", "true");
  candidateBillingApi.getCandidateSubscription.mockReset();
  userService.getCurrentUser.mockReset();
});

describe("CandidateSubscriptionProvider — user-scoped plan cache", () => {
  test(
    "CSUB-1 (regression): a Premium plan cached for user A must NOT be applied to user B on the same browser",
    async () => {
      // Simulate user A's earlier session having cached PREMIUM.
      localStorage.setItem(PLAN_CACHE_KEY, "PREMIUM");
      localStorage.setItem(PLAN_CACHE_USER_KEY, "user-A");

      // User B logs in on the same browser now. The real subscription fetch
      // hangs so we can observe the plan the UI shows BEFORE any fresh data
      // arrives — this is exactly the pre-API-response window the bug hit.
      userService.getCurrentUser.mockResolvedValue(user("user-B"));
      candidateBillingApi.getCandidateSubscription.mockImplementation(() => new Promise(() => {}));

      renderProbe();

      expect(await screen.findByText("user:user-B plan:FREE", {}, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.queryByText("user:user-B plan:PREMIUM")).not.toBeInTheDocument();
    },
    15000
  );

  test(
    "CSUB-2: a Premium plan cached for the SAME user IS applied immediately, before the API call resolves",
    async () => {
      localStorage.setItem(PLAN_CACHE_KEY, "PREMIUM");
      localStorage.setItem(PLAN_CACHE_USER_KEY, "user-A");

      userService.getCurrentUser.mockResolvedValue(user("user-A"));
      candidateBillingApi.getCandidateSubscription.mockImplementation(() => new Promise(() => {}));

      renderProbe();

      expect(await screen.findByText("user:user-A plan:PREMIUM", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );

  test(
    "CSUB-3: refreshSubscription writes the cache scoped to the current user id, not globally",
    async () => {
      userService.getCurrentUser.mockResolvedValue(user("user-C"));
      candidateBillingApi.getCandidateSubscription.mockResolvedValue({
        planType: "PREMIUM",
        status: "ACTIVE",
      });

      renderProbe();

      expect(await screen.findByText("user:user-C plan:PREMIUM", {}, { timeout: 10000 })).toBeInTheDocument();
      expect(localStorage.getItem(PLAN_CACHE_KEY)).toBe("PREMIUM");
      expect(localStorage.getItem(PLAN_CACHE_USER_KEY)).toBe("user-C");
    },
    15000
  );

  test(
    "CSUB-4: no cache at all still resolves to the real FREE plan once the API responds",
    async () => {
      userService.getCurrentUser.mockResolvedValue(user("user-D"));
      candidateBillingApi.getCandidateSubscription.mockResolvedValue({
        planType: "FREE",
        status: "ACTIVE",
      });

      renderProbe();

      expect(await screen.findByText("user:user-D plan:FREE", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );
});
