import { describe, test, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderStudio, freeSubscriptionReady, getMockedGetMySubscription } from "./studio-test-utils";
import { PreferencesSection } from "@/features/settings/components/preferences-section";
import { NotificationsSection } from "@/features/settings/components/notifications-section";

// Grounded in src/features/settings/components/preferences-section.tsx and
// notifications-section.tsx — HR's Settings > Preferences / Notifications
// tabs. Neither had any prior automated coverage. Notifications' Save button
// has no backend to persist to, so it's rendered `disabled` with a
// `title={t.common.comingSoon}` tooltip instead of being left silently
// non-functional (dead-button fix). Preferences has no Save button at all —
// the theme picker persists instantly on click, so its footer CTA is instead
// "Send Feedback", opening SubmitFeedbackDialog. Renders each section
// directly via studio-test-utils.tsx's renderStudio (HrSubscriptionProvider)
// since PreferencesSection reads useHrSubscription() for its AI-model gating.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(async () => {
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
});

describe("HR Settings — Preferences", () => {
  test('HRPREF-1: the "Send Feedback" button opens the feedback dialog', async () => {
    renderStudio(<PreferencesSection />);
    await screen.findByText("Preferences", {}, { timeout: 10000 });

    const sendFeedbackBtn = screen.getByRole("button", { name: "Send Feedback" });
    expect(sendFeedbackBtn).toBeEnabled();

    fireEvent.click(sendFeedbackBtn);
    expect(await screen.findByText("Share Your Feedback")).toBeInTheDocument();
  });
});

describe("HR Settings — Notifications", () => {
  test('HRNOTIF-1: the "Save Changes" button is disabled with a Coming soon tooltip', async () => {
    renderStudio(<NotificationsSection />);
    expect(await screen.findByText("Notification Preferences", {}, { timeout: 10000 })).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "Save Changes" });
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute("title", "Coming soon");
  });

  test("HRNOTIF-2: toggling a notification preference updates its checked state", async () => {
    renderStudio(<NotificationsSection />);
    await screen.findByText("Notification Preferences", {}, { timeout: 10000 });

    const toggles = screen.getAllByRole("switch");
    expect(toggles.length).toBeGreaterThan(0);
    const first = toggles[0];
    const before = first.getAttribute("aria-checked");
    fireEvent.click(first);
    expect(first.getAttribute("aria-checked")).not.toBe(before);
  });
});
