import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
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

beforeEach(() => {
  settingsApi.getPlatformSettings.mockReset();
  settingsApi.updatePlatformSettings.mockReset();
});

describe("Admin Platform Settings — General", () => {
  test("APS-1: loads and displays platform settings from the API", async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({
      platformName: "HireGen AI Prod",
      defaultQuestionCount: 20,
      maxJdsPerDay: 30,
      sessionTimeout: 45,
      minQuestionsToPublish: 8,
      maxPinnedSets: 3,
      minAttemptsForTrending: 15,
    });
    renderWithProviders(<AdminSettingsPage />);

    expect(await screen.findByDisplayValue("HireGen AI Prod", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByLabelText("Default Question Count")).toHaveValue(20);
    expect(screen.getByLabelText("Session Timeout (minutes)")).toHaveValue(45);
  });

  test("APS-2: a load failure shows Retry, and Retry re-fetches", async () => {
    settingsApi.getPlatformSettings.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);

    const retryBtn = await screen.findByRole("button", { name: "Thử lại" }, { timeout: 10000 });
    settingsApi.getPlatformSettings.mockResolvedValue({ platformName: "HireGen AI Prod" });
    await user.click(retryBtn);

    expect(await screen.findByDisplayValue("HireGen AI Prod", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("APS-3: saving calls updatePlatformSettings with the edited platform name", async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({ platformName: "HireGen AI" });
    settingsApi.updatePlatformSettings.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByDisplayValue("HireGen AI", {}, { timeout: 10000 });

    const nameInput = screen.getByLabelText("Platform Name");
    await user.clear(nameInput);
    await user.type(nameInput, "HireGen AI v2");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await vi.waitFor(() =>
      expect(settingsApi.updatePlatformSettings).toHaveBeenCalledWith(
        expect.objectContaining({ platformName: "HireGen AI v2" })
      )
    );
    expect(await screen.findByText("Settings saved locally.")).toBeInTheDocument();
  });
});

describe("Admin Platform Settings — Permissions", () => {
  test("APS-4: Admin's permissions are locked, Recruiter's can be toggled", async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByText("General Settings", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Permissions" }));
    const row = (await screen.findByText("Manage Users")).closest("tr") as HTMLElement;
    const [adminToggle, recruiterToggle] = within(row).getAllByRole("switch");

    expect(adminToggle).toBeDisabled();
    expect(recruiterToggle).toHaveAttribute("aria-checked", "false");
    await user.click(recruiterToggle);
    expect(recruiterToggle).toHaveAttribute("aria-checked", "true");
  });

  test('APS-5: the Permissions "Save Permissions" button is disabled with a Coming soon tooltip, not a silently broken active button', async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByText("General Settings", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Permissions" }));
    const saveBtn = screen.getByRole("button", { name: "Save Permissions" });
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute("title", "Coming soon");
  });
});

describe("Admin Platform Settings — Notifications", () => {
  test("APS-6: toggling a notification event's Email channel updates its state", async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByText("General Settings", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    const row = (await screen.findByText("JD Generation")).closest("tr") as HTMLElement;
    const [emailToggle] = within(row).getAllByRole("switch");

    expect(emailToggle).toHaveAttribute("aria-checked", "false");
    await user.click(emailToggle);
    expect(emailToggle).toHaveAttribute("aria-checked", "true");
  });

  test('APS-7: the "Save Notifications" button is disabled with a Coming soon tooltip', async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByText("General Settings", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    const saveBtn = screen.getByRole("button", { name: "Save Notifications" });
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute("title", "Coming soon");
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
