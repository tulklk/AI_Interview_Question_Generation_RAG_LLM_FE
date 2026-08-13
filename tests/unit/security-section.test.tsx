import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { SecuritySection } from "@/features/settings/components/security-section";

// Grounded in src/features/settings/components/security-section.tsx — the
// change-password form shared by Candidate and HR Settings' "Security" tab.
// No prior automated coverage existed. Mocks @/features/auth/services/user.service
// at the module boundary.

vi.mock("@/features/auth/services/user.service", () => ({
  changePassword: vi.fn(),
}));

import * as userApiTyped from "@/features/auth/services/user.service";
const userApi = userApiTyped as unknown as { changePassword: ReturnType<typeof vi.fn> };

beforeEach(() => {
  userApi.changePassword.mockReset();
});

function fillForm(current: string, next: string, confirm: string) {
  const user = userEvent.setup();
  return (async () => {
    if (current) await user.type(screen.getByLabelText("Current Password"), current);
    if (next) await user.type(screen.getByLabelText("New Password"), next);
    if (confirm) await user.type(screen.getByLabelText("Confirm New Password"), confirm);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
  })();
}

describe("Security — change password", () => {
  test("SEC-1: submitting with empty fields shows an error and never calls the API", async () => {
    renderWithProviders(<SecuritySection />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Could not update password. Please try again.")).toBeInTheDocument();
    expect(userApi.changePassword).not.toHaveBeenCalled();
  });

  test("SEC-2: a new password under 8 characters is rejected client-side", async () => {
    renderWithProviders(<SecuritySection />);

    await fillForm("oldpass1", "short1", "short1");

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(userApi.changePassword).not.toHaveBeenCalled();
  });

  test("SEC-3: a mismatched confirmation is rejected client-side", async () => {
    renderWithProviders(<SecuritySection />);

    await fillForm("oldpass1", "newpassword1", "differentpassword1");

    expect(await screen.findByText("New passwords do not match.")).toBeInTheDocument();
    expect(userApi.changePassword).not.toHaveBeenCalled();
  });

  test("SEC-4: a valid submission calls changePassword and clears the form on success", async () => {
    userApi.changePassword.mockResolvedValue(undefined);
    renderWithProviders(<SecuritySection />);

    await fillForm("oldpass1", "newpassword1", "newpassword1");

    expect(userApi.changePassword).toHaveBeenCalledWith({
      currentPassword: "oldpass1",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(await screen.findByText("Password updated successfully.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current Password")).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
  });

  test("SEC-5: an API failure shows the generic save-failed error", async () => {
    userApi.changePassword.mockRejectedValue(new Error("network down"));
    renderWithProviders(<SecuritySection />);

    await fillForm("oldpass1", "newpassword1", "newpassword1");

    expect(await screen.findByText("Could not update password. Please try again.")).toBeInTheDocument();
  });
});
