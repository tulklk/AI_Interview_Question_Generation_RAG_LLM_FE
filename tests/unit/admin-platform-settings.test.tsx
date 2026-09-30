import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminSettingsPage from "@/app/admin/settings/page";

// Grounded in src/app/admin/settings/page.tsx and
// src/features/admin/components/settings/* — Admin's Platform Settings page
// (General/Permissions/Notifications tabs). No prior automated coverage
// existed. Only the General tab talks to a real service
// (admin-platform-settings.service); Permissions and Notifications are pure
// client-side toggle grids. Their Save buttons — and General's "Reset
// Platform Data" danger-zone button — have no backend to save/reset to yet,
// so each is rendered `disabled` with a `title={t.common.comingSoon}`
// tooltip rather than left silently non-functional (dead-button fix, see
// APS-5/7/8 below).

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/services/admin-platform-settings.service", () => ({
  getPlatformSettings: vi.fn(),
  updatePlatformSettings: vi.fn(),
}));

import * as settingsApiTyped from "@/features/admin/services/admin-platform-settings.service";
const settingsApi = settingsApiTyped as unknown as {
  getPlatformSettings: ReturnType<typeof vi.fn>;
  updatePlatformSettings: ReturnType<typeof vi.fn>;
};

const MIN_QUESTIONS_LABEL = "Minimum questions for HR to publish a set to the marketplace";
const MAX_PINNED_LABEL = "Maximum sets pinned on the Marketplace";
const TRENDING_LABEL = "Practice attempts needed to show the Trending badge";

beforeEach(() => {
  settingsApi.getPlatformSettings.mockReset();
  settingsApi.updatePlatformSettings.mockReset();
});

describe("Admin Platform Settings — General", () => {
  test("APS-1: loads and displays platform settings from the API", async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({
      minQuestionsToPublish: 8,
      maxPinnedSets: 3,
      minAttemptsForTrending: 15,
    });
    renderWithProviders(<AdminSettingsPage />);

    expect(await screen.findByLabelText(MIN_QUESTIONS_LABEL, {}, { timeout: 10000 })).toHaveValue(8);
    expect(screen.getByLabelText(MAX_PINNED_LABEL)).toHaveValue(3);
    expect(screen.getByLabelText(TRENDING_LABEL)).toHaveValue(15);
  });

  test("APS-2: a load failure shows Retry, and Retry re-fetches", async () => {
    settingsApi.getPlatformSettings.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);

    const retryBtn = await screen.findByRole("button", { name: "Retry" }, { timeout: 10000 });
    settingsApi.getPlatformSettings.mockResolvedValue({ minQuestionsToPublish: 8 });
    await user.click(retryBtn);

    expect(await screen.findByLabelText(MIN_QUESTIONS_LABEL, {}, { timeout: 10000 })).toHaveValue(8);
  });

  test("APS-3: saving calls updatePlatformSettings with the edited minimum-questions value", async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({ minQuestionsToPublish: 8 });
    settingsApi.updatePlatformSettings.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);

    const minInput = await screen.findByLabelText(MIN_QUESTIONS_LABEL, {}, { timeout: 10000 });
    await user.clear(minInput);
    await user.type(minInput, "12");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await vi.waitFor(() =>
      expect(settingsApi.updatePlatformSettings).toHaveBeenCalledWith(
        expect.objectContaining({ minQuestionsToPublish: 12 })
      )
    );
    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
  });
});

describe("Admin Platform Settings — General danger zone", () => {
  test('APS-8: the "Reset Platform Data" button is disabled with a Coming soon tooltip, not a live destructive action', async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({});
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByText("General Settings", {}, { timeout: 10000 });

    const resetBtn = await screen.findByRole("button", { name: "Reset" }, { timeout: 10000 });
    expect(resetBtn).toBeDisabled();
    expect(resetBtn).toHaveAttribute("title", "Coming soon");
  });
});
