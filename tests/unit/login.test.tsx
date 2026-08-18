import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { LoginForm } from "@/features/auth/components/login-form";

// Grounded in src/features/auth/hooks/use-login.ts, login-form.tsx,
// utils/login-errors.ts, and src/core/i18n/en.ts (`loginPage` section).
// Maps to Excel sheet AUTH002_Login. Unit-test rewrite (Vitest + RTL) of the
// former login.spec.ts Playwright E2E suite: renders LoginForm in isolation,
// mocks the service module boundary (not the network layer).

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/login",
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  login: vi.fn(),
  resendVerification: vi.fn(),
}));

vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn().mockRejectedValue(new Error("not authenticated")),
}));

import { login } from "@/features/auth/services/auth.service";

function axiosError(status: number, message: string) {
  return { response: { status, data: { message } } };
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  vi.mocked(login).mockReset();
});

describe("AUTH002 — Login form", () => {
  test("AUTH002-1: empty email shows \"Email is required\"", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("••••••••"), "somepassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  test("AUTH002-2: empty password shows \"Password is required\"", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  test("AUTH002-3: wrong password (401) shows invalidCredentials toast", async () => {
    vi.mocked(login).mockRejectedValueOnce(axiosError(401, "Invalid credentials"));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email or password is incorrect. Please try again.")).toBeInTheDocument();
  });

  test("AUTH002-4: disabled account (403) shows accountDisabled toast", async () => {
    vi.mocked(login).mockRejectedValueOnce(axiosError(403, "Account is disabled"));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "correctpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Your account has been disabled. Please contact the administrator.")
    ).toBeInTheDocument();
  });

  test("AUTH002-5: unverified account opens the resend-verification dialog", async () => {
    vi.mocked(login).mockRejectedValueOnce(axiosError(400, "Email is not verified"));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "correctpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("heading", { name: "Email not verified" })).toBeInTheDocument();
    expect(screen.getByText("Resend email")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  test("AUTH002-6: valid HR credentials redirect to /hr/dashboard", async () => {
    vi.mocked(login).mockResolvedValueOnce({
      accessToken: "fake-token",
      refreshToken: "fake-refresh",
      role: "HR_MANAGER",
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "correctpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(push.mock.calls[0][0]).toContain("/hr/dashboard");
  });

  test("AUTH002-7: valid Jobseeker credentials redirect to /candidate", async () => {
    vi.mocked(login).mockResolvedValueOnce({
      accessToken: "fake-token",
      refreshToken: "fake-refresh",
      role: "JOB_SEEKER",
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "candidate@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "correctpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(push.mock.calls[0][0]).toContain("/candidate");
  });
});

// Unit-test rewrite of ui-visual-layout-6.spec.ts's UI017-2 — Tab order is a
// pure DOM focus-traversal concern (userEvent.tab() implements the browser's
// own algorithm), so it doesn't need the AppShell/real-viewport rig the
// other UI017/UI0xx visual-layout cases require — those live in
// ui-sidebar-drawer-and-logo.test.tsx, ui-upgrade-modal.test.tsx, and
// ui-responsive-overflow-shell.test.tsx instead.
describe("UI017 — Login form keyboard Tab order", () => {
  test("UI017-2: Tab order moves Email -> Password -> Sign in in a logical sequence", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    const emailInput = screen.getByPlaceholderText("you@company.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    const signInBtn = screen.getByRole("button", { name: /sign in/i });

    emailInput.focus();
    expect(emailInput).toHaveFocus();

    // Bounded (rather than asserting exact adjacency) so a real focus-trap
    // regression fails loudly instead of looping forever — icons/toggles
    // (e.g. show/hide password) may legitimately sit in between.
    async function tabUntilFocused(target: HTMLElement, maxTabs: number) {
      for (let i = 0; i < maxTabs; i++) {
        await user.tab();
        if (document.activeElement === target) return;
      }
      throw new Error(`Never reached target within ${maxTabs} tabs`);
    }

    await tabUntilFocused(passwordInput, 3);
    await tabUntilFocused(signInBtn, 5);
  });
});
