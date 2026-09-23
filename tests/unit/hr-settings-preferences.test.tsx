import { describe, test, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderStudio, freeSubscriptionReady, getMockedGetMySubscription } from "./studio-test-utils";
import { PreferencesSection } from "@/features/settings/components/preferences-section";

// Grounded in src/features/settings/components/preferences-section.tsx — HR's
// Settings > Preferences tab. The Notifications tab/section (and its
// settings.ts types/data) was removed in 8875f3b3 - the Settings layout now
// only has profile/preferences/security/billing, so that coverage was
// deleted along with it rather than kept for a component that no longer
// exists. Preferences has no Save button at all — the theme picker persists
// instantly on click, so its footer CTA is instead "Send Feedback", opening
// SubmitFeedbackDialog. Renders directly via studio-test-utils.tsx's
// renderStudio (HrSubscriptionProvider) since PreferencesSection reads
// useHrSubscription() for its AI-model gating.

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
