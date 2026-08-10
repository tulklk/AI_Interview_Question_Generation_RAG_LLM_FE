import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { ResetPasswordContent } from "@/features/auth/components/reset-password-content";

// Grounded in src/app/forgot-password/page.tsx, src/features/auth/components/
// reset-password-content.tsx, and src/core/i18n/en.ts (`forgotPasswordPage` /
// `resetPasswordPage`). Maps to Excel sheet AUTH005_ForgotResetPassword.
// Unit-test rewrite of the former forgot-reset-password.spec.ts Playwright suite.

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/reset-password",
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

import { forgotPassword, resetPassword } from "@/features/auth/services/auth.service";

beforeEach(() => {
  push.mockClear();
  vi.mocked(forgotPassword).mockReset();
  vi.mocked(resetPassword).mockReset();
  searchParams = new URLSearchParams();
});

describe("AUTH005 — Forgot password", () => {
  test("AUTH005-1: blocks submit with empty email", async () => {
    renderWithProviders(<ForgotPasswordPage />);
    // The submit button is disabled while email.trim() is empty (page.tsx:177),
    // so a whitespace-only value can never be submitted by clicking it in a
    // real browser either — submit the form directly to reach the validation
    // branch, same as the Playwright version did via form.requestSubmit().
    const emailInput = screen.getByPlaceholderText(/you@company\.com/i);
    await userEvent.type(emailInput, " ");
    const form = emailInput.closest("form")!;
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  test("AUTH005-2: rejects an invalid email format", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  test("AUTH005-3: shows the generic success screen for a valid email", async () => {
    vi.mocked(forgotPassword).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
    expect(
      screen.getByText("If an account exists for this email, we've sent password reset instructions.")
    ).toBeInTheDocument();
    expect(screen.getByText("someone@example.com")).toBeInTheDocument();
  });
});

describe("AUTH005 — Reset password", () => {
  test("AUTH005-4: shows the token-error panel when no token is in the URL", async () => {
    searchParams = new URLSearchParams();
    renderWithProviders(<ResetPasswordContent />);
    expect(
      screen.getByText("This reset link is invalid or has expired. Please request a new one.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  test("AUTH005-5: blocks submit when the new password is under 8 characters", async () => {
    searchParams = new URLSearchParams({ token: "valid-token-abc" });
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordContent />);
    expect(screen.getByText("Set new password")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Pw1!");
    await user.type(screen.getByPlaceholderText("Repeat your new password"), "Pw1!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  test("AUTH005-6: blocks submit on confirm-password mismatch", async () => {
    searchParams = new URLSearchParams({ token: "valid-token-abc" });
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordContent />);
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your new password"), "Different1!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
  });

  test("AUTH005-7: an expired/invalid token (400) shows the token-error panel", async () => {
    searchParams = new URLSearchParams({ token: "expired-token" });
    vi.mocked(resetPassword).mockRejectedValueOnce({
      response: { status: 400, data: { message: "Token has expired" } },
    });
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordContent />);
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your new password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(
      await screen.findByText("This reset link is invalid or has expired. Please request a new one.")
    ).toBeInTheDocument();
  });

  test("AUTH005-8: valid submit redirects to /login?reset=success", async () => {
    searchParams = new URLSearchParams({ token: "valid-token-abc" });
    vi.mocked(resetPassword).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordContent />);
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your new password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?reset=success"));
  });
});
