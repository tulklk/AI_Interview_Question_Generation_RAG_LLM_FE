import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { candidateBillingServiceMockFactory, freeCandidateSubscription } from "./candidate-service-mocks";
import { renderCandidate } from "./candidate-test-utils";
import { SettingsPage } from "@/features/candidate/components/settings/settings-page";

// Grounded in src/features/candidate/components/settings/settings-page.tsx —
// the Candidate "Settings" hub (tab routing + General/Privacy orchestration).
// No prior automated coverage existed. Renders <SettingsPage> via
// candidate-test-utils.tsx's renderCandidate (CandidateSubscriptionProvider),
// mocking candidate-billing.service (subscription/plan gating),
// privacy-settings.service and candidate-cv.service at the module boundary.
//
// The Profile and Billing tabs delegate to their own large, independently
// covered components (CandidateProfile / CandidateBillingPage — see
// candidate-billing.test.tsx and the dedicated Candidate Profile task); they
// are mocked here to lightweight placeholders so this file stays scoped to
// SettingsPage's own tab-routing responsibility. XP History is likewise
// mocked away — it belongs to the separate Gamification testing task and
// isn't part of this settings-tab list (CV, Privacy, General, Security,
// Billing).

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/candidate/settings",
}));

vi.mock("@/features/candidate/services/candidate-billing.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.candidateBillingServiceMockFactory();
});

vi.mock("@/features/candidate/services/privacy-settings.service", () => ({
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
}));

vi.mock("@/features/candidate/services/candidate-cv.service", () => ({
  getCvSyncSettings: vi.fn(),
  updateCvSyncSettings: vi.fn(),
}));

vi.mock("@/features/candidate/components/profile/candidate-profile", () => ({
  CandidateProfile: () => <div>[CandidateProfile]</div>,
}));

vi.mock("@/features/candidate/components/billing/candidate-billing-page", () => ({
  CandidateBillingPage: () => <div>[CandidateBillingPage]</div>,
}));

vi.mock("@/features/gamification/components/daily-goal-settings", () => ({
  DailyGoalSettings: () => <div>[DailyGoalSettings]</div>,
}));

vi.mock("@/features/gamification/components/xp-history-section", () => ({
  XpHistorySection: () => <div>[XpHistorySection]</div>,
}));

import * as candidateBillingApiTyped from "@/features/candidate/services/candidate-billing.service";
import * as privacyApiTyped from "@/features/candidate/services/privacy-settings.service";
import * as cvApiTyped from "@/features/candidate/services/candidate-cv.service";

const candidateBillingApi = candidateBillingApiTyped as unknown as ReturnType<typeof candidateBillingServiceMockFactory>;
const privacyApi = privacyApiTyped as unknown as { getPrivacySettings: ReturnType<typeof vi.fn>; updatePrivacySettings: ReturnType<typeof vi.fn> };
const cvApi = cvApiTyped as unknown as { getCvSyncSettings: ReturnType<typeof vi.fn>; updateCvSyncSettings: ReturnType<typeof vi.fn> };

beforeEach(() => {
  searchParams = new URLSearchParams();
  candidateBillingApi.getCandidateSubscription.mockReset();
  candidateBillingApi.getCandidateSubscription.mockResolvedValue(freeCandidateSubscription());
  privacyApi.getPrivacySettings.mockReset();
  privacyApi.getPrivacySettings.mockResolvedValue(true);
  privacyApi.updatePrivacySettings.mockReset();
  privacyApi.updatePrivacySettings.mockResolvedValue(undefined);
  cvApi.getCvSyncSettings.mockReset();
  cvApi.getCvSyncSettings.mockResolvedValue(true);
  cvApi.updateCvSyncSettings.mockReset();
  cvApi.updateCvSyncSettings.mockResolvedValue(undefined);
});

describe("Candidate Settings — tab routing", () => {
  test("CSET-1: defaults to the Profile tab", async () => {
    renderCandidate(<SettingsPage />);

    expect(await screen.findByText("[CandidateProfile]")).toBeInTheDocument();
  });

  test("CSET-2: the ?tab= query param opens that tab on load", async () => {
    searchParams = new URLSearchParams({ tab: "billing" });
    renderCandidate(<SettingsPage />);

    expect(await screen.findByText("[CandidateBillingPage]")).toBeInTheDocument();
  });

  test("CSET-3: clicking the General nav item switches to the General tab", async () => {
    const user = userEvent.setup();
    renderCandidate(<SettingsPage />);
    await screen.findByText("[CandidateProfile]");

    const generalButtons = await screen.findAllByText("General");
    await user.click(generalButtons[generalButtons.length - 1]);

    expect(await screen.findByText("Language")).toBeInTheDocument();
  });
});

describe("Candidate Settings — General", () => {
  test("CSET-4: toggling CV sync off calls updateCvSyncSettings(false)", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ tab: "general" });
    renderCandidate(<SettingsPage />);
    await screen.findByText("Language");

    const cvSyncRow = (await screen.findByText("Auto-sync profile from CV")).closest("div.flex") as HTMLElement;
    const toggle = within(cvSyncRow).getByRole("switch");
    await user.click(toggle);

    await vi.waitFor(() => expect(cvApi.updateCvSyncSettings).toHaveBeenCalledWith(false));
  });

  test("CSET-5: switching language to Tiếng Việt re-labels the General tab", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ tab: "general" });
    renderCandidate(<SettingsPage />);
    await screen.findByText("Language");

    await user.click(screen.getByText("Tiếng Việt"));

    expect(await screen.findByText("Ngôn ngữ")).toBeInTheDocument();
  });
});

describe("Candidate Settings — Privacy", () => {
  test("CSET-6: a Premium candidate can toggle recruiter recommendations", async () => {
    candidateBillingApi.getCandidateSubscription.mockResolvedValue({ planType: "PREMIUM", status: "ACTIVE" });
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ tab: "privacy" });
    renderCandidate(<SettingsPage />);
    await screen.findByText("Recruiter recommendations");

    const toggle = await screen.findByRole("switch");
    await user.click(toggle);

    await vi.waitFor(() => expect(privacyApi.updatePrivacySettings).toHaveBeenCalledWith(false));
    expect(await screen.findByText("Preference updated")).toBeInTheDocument();
  });

  test('CSET-7: a Free candidate sees the "Premium only" lock instead of a toggle, and clicking it opens the upgrade prompt', async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ tab: "privacy" });
    renderCandidate(<SettingsPage />);
    await screen.findByText("Recruiter recommendations");

    expect(screen.getByText("Premium only")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    await user.click(screen.getByText("Upgrade to Premium"));

    expect(await screen.findByRole("heading", { name: /Premium/i })).toBeInTheDocument();
  });
});
