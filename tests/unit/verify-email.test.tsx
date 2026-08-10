import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import VerifyEmailPage from "@/app/verify-email/page";

// Grounded in src/app/verify-email/page.tsx and src/core/i18n/en.ts
// (`verifyEmailPage` section). Maps to Excel sheet AUTH004_VerifyEmail.
// Unit-test rewrite of the former verify-email.spec.ts Playwright suite.

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/verify-email",
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
}));

import { verifyEmail, resendVerification } from "@/features/auth/services/auth.service";

async function fillOtp(digits: string[]) {
  const boxes = screen.getAllByRole("textbox");
  const user = userEvent.setup();
  for (let i = 0; i < digits.length; i++) {
    await user.type(boxes[i], digits[i]);
  }
}

beforeEach(() => {
  push.mockClear();
  vi.mocked(verifyEmail).mockReset();
  vi.mocked(resendVerification).mockReset();
  searchParams = new URLSearchParams();
});

describe("AUTH004 — Verify email", () => {
  test("AUTH004-1: no email in URL shows the missing-email view", () => {
    searchParams = new URLSearchParams();
    renderWithProviders(<VerifyEmailPage />);
    expect(screen.getByText("No email found. Please register again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to login" })).toBeInTheDocument();
  });

  test("AUTH004-2: correct OTP shows the success panel and redirects to /login", async () => {
    searchParams = new URLSearchParams({ email: "candidate@example.com" });
    vi.mocked(verifyEmail).mockResolvedValueOnce(undefined);
    renderWithProviders(<VerifyEmailPage />);
    expect(screen.getByRole("heading", { name: "Verify your email" })).toBeInTheDocument();

    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(6);
    await fillOtp(["1", "2", "3", "4", "5", "6"]);
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByRole("heading", { name: "Email verified!" })).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledWith("candidate@example.com", "123456");
    // Auto-redirect fires after a real 3s setTimeout (page component, not faked here).
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"), { timeout: 4000 });
  });

  test("AUTH004-3: wrong OTP shows an error and clears the boxes", async () => {
    searchParams = new URLSearchParams({ email: "candidate@example.com" });
    vi.mocked(verifyEmail).mockRejectedValueOnce({
      response: { data: { message: "Invalid or expired verification code. Please try again." } },
    });
    renderWithProviders(<VerifyEmailPage />);
    await fillOtp(["1", "2", "3", "4", "5", "6"]);
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(
      await screen.findByText("Invalid or expired verification code. Please try again.")
    ).toBeInTheDocument();
    const boxes = screen.getAllByRole("textbox");
    expect(boxes[0]).toHaveValue("");
  });

  test("AUTH004-4: resend fires immediately and then disables with a cooldown", async () => {
    searchParams = new URLSearchParams({ email: "candidate@example.com" });
    vi.mocked(resendVerification).mockResolvedValueOnce(undefined);
    renderWithProviders(<VerifyEmailPage />);
    const resendBtn = screen.getByRole("button", { name: /Resend code|Resend in/ });
    await userEvent.click(resendBtn);

    expect(
      await screen.findByText("A new verification code has been sent to your email.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();
  });

  test("AUTH004-5: pasting 6 digits at once auto-fills all boxes", async () => {
    searchParams = new URLSearchParams({ email: "candidate@example.com" });
    renderWithProviders(<VerifyEmailPage />);
    const boxes = screen.getAllByRole("textbox");
    // The component's onChange treats a >1-char value as a paste.
    await userEvent.click(boxes[0]);
    await userEvent.paste("123456");

    expect(boxes[0]).toHaveValue("1");
    expect(boxes[1]).toHaveValue("2");
    expect(boxes[5]).toHaveValue("6");
  });
});
