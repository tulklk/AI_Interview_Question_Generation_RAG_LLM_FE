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
// client-side toggle grids with a Save button that has no onClick handler at
// all (documented below as a finding, not silently treated as working).

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

  test('APS-5 (finding): the Permissions "Save Permissions" button has no click handler — clicking it does nothing, not even a toast', async () => {
    settingsApi.getPlatformSettings.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<AdminSettingsPage />);
    await screen.findByText("General Settings", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Permissions" }));
    await user.click(screen.getByRole("button", { name: "Save Permissions" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
});
