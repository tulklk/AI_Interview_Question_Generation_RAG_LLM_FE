import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminPlansRoutePage from "@/app/admin/plans/page";
import type { SubscriptionPlan } from "@/features/subscription/services/subscription.service";

// Grounded in src/app/admin/plans/page.tsx and
// src/features/admin/components/plans/admin-plans-page.tsx — Admin's
// Subscription Plans editor (price/limit editing per plan, save). No prior
// automated coverage existed. AdminRouteGuard/AdminAppShell stubbed to
// pass-through per the established admin-page pattern. Mocks
// adminListPlans/adminUpdatePlan on subscription.service; <AdminPlansStats>
// (the SePay revenue/analytics widget, 500 lines of its own) is mocked to a
// placeholder — a separate concern from plan editing, out of scope here.

vi.mock("@/features/admin/components/guards/admin-route-guard", () => ({
  AdminRouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/plans/admin-plans-stats", () => ({
  AdminPlansStats: () => <div>[AdminPlansStats]</div>,
}));

vi.mock("@/features/subscription/services/subscription.service", () => ({
  adminListPlans: vi.fn(),
  adminUpdatePlan: vi.fn(),
}));

import * as subscriptionApiTyped from "@/features/subscription/services/subscription.service";
const subscriptionApi = subscriptionApiTyped as unknown as {
  adminListPlans: ReturnType<typeof vi.fn>;
  adminUpdatePlan: ReturnType<typeof vi.fn>;
};

function plan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    id: "plan-hr-premium",
    code: "HR_PREMIUM",
    audience: "HR",
    name: "HR Premium",
    priceMonthly: 199000,
    currency: "VND",
    isActive: true,
    limits: {
      generateCooldownHours: 0,
      generateUnlimited: true,
      planRegeneratePerDraft: 5,
      canExport: true,
      askAiPerMonth: 999,
      canPublish: true,
      freeVisiblePercent: 100,
      canPersistHrRecommendation: true,
      feedbackOnlyOnVisible: false,
    },
    ...overrides,
  };
}

beforeEach(() => {
  subscriptionApi.adminListPlans.mockReset();
  subscriptionApi.adminUpdatePlan.mockReset();
});

describe("Admin Plans — listing", () => {
  test("APLAN-1: lists plans fetched via adminListPlans", async () => {
    subscriptionApi.adminListPlans.mockResolvedValue([plan()]);
    renderWithProviders(<AdminPlansRoutePage />);

    expect(await screen.findByDisplayValue("HR Premium", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("999")).toBeInTheDocument(); // Ask-AI / period
  });

  test("APLAN-2: Refresh re-fetches the plan list", async () => {
    subscriptionApi.adminListPlans.mockResolvedValue([plan()]);
    const user = userEvent.setup();
    renderWithProviders(<AdminPlansRoutePage />);
    await screen.findByDisplayValue("HR Premium", {}, { timeout: 10000 });

    subscriptionApi.adminListPlans.mockResolvedValue([plan({ name: "HR Premium Renamed" })]);
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByDisplayValue("HR Premium Renamed", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("Admin Plans — editing and saving", () => {
  test("APLAN-3: editing the Ask-AI limit and saving calls adminUpdatePlan with the new value", async () => {
    subscriptionApi.adminListPlans.mockResolvedValue([plan()]);
    subscriptionApi.adminUpdatePlan.mockResolvedValue({ plan: plan({ limits: { ...plan().limits, askAiPerMonth: 500 } }), message: "ok" });
    const user = userEvent.setup();
    renderWithProviders(<AdminPlansRoutePage />);
    await screen.findByDisplayValue("HR Premium", {}, { timeout: 10000 });

    const askAiInput = screen.getByDisplayValue("999");
    await user.clear(askAiInput);
    await user.type(askAiInput, "500");
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    await vi.waitFor(() =>
      expect(subscriptionApi.adminUpdatePlan).toHaveBeenCalledWith(
        "plan-hr-premium",
        expect.objectContaining({ limits: expect.objectContaining({ askAiPerMonth: 500 }) })
      )
    );
    expect(
      await screen.findByText("Saved. New limits apply from the next billing period for existing subscribers.")
    ).toBeInTheDocument();
  });

  test("APLAN-4: a save failure shows the generic save-error toast", async () => {
    subscriptionApi.adminListPlans.mockResolvedValue([plan()]);
    subscriptionApi.adminUpdatePlan.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<AdminPlansRoutePage />);
    await screen.findByDisplayValue("HR Premium", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Save plan" }));

    expect(await screen.findByText("Failed to save the plan.")).toBeInTheDocument();
  });

  test("APLAN-5: the Free visible % field clamps to a maximum of 100", async () => {
    subscriptionApi.adminListPlans.mockResolvedValue([plan({ limits: { ...plan().limits, freeVisiblePercent: 50 } })]);
    const user = userEvent.setup();
    renderWithProviders(<AdminPlansRoutePage />);
    await screen.findByDisplayValue("HR Premium", {}, { timeout: 10000 });

    const freeVisibleInput = screen.getByDisplayValue("50");
    await user.clear(freeVisibleInput);
    await user.type(freeVisibleInput, "150");
    await user.tab();

    expect(await screen.findByDisplayValue("100")).toBeInTheDocument();
  });
});
