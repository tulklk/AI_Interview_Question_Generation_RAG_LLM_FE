import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { RegisterForm } from "@/features/auth/components/register-form";

// Grounded in src/features/auth/components/register-form.tsx and
// src/features/auth/hooks/use-register.ts (registerRole="hr", the default),
// plus src/core/i18n/en.ts (`registerPage` section). Maps to Excel sheet
// AUTH001_RegisterHR. Unit-test rewrite of the former register-hr.spec.ts
// Playwright suite: renders RegisterForm directly (RegisterRoleTabs defaults
// to it), mocking the service module boundary.

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/register",
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  registerHr: vi.fn(),
}));

import { registerHr } from "@/features/auth/services/auth.service";

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("John Doe"), "Nguyen Van A");
  await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
  await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
  await user.type(screen.getByPlaceholderText("Repeat your password"), "Password1!");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  // step2Title is rendered word-by-word in separate <span>s (no text-node
  // space between them) — jsdom's accessible-name computation collapses that
  // to "YourProfile", unlike a real browser's layout-aware algorithm. \s*
  // tolerates either.
  expect(await screen.findByRole("heading", { name: /Your\s*Profile/ })).toBeInTheDocument();
}

beforeEach(() => {
  push.mockClear();
  vi.mocked(registerHr).mockReset();
});

describe("AUTH001 — Register HR, step 1", () => {
  test("AUTH001-1: blocks Continue when full name is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Full name is required")).toBeInTheDocument();
  });

  test("AUTH001-2: blocks Continue when password is under 8 characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Nguyen Van A");
    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Pw1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Pw1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  test("AUTH001-3: blocks Continue when password is missing a complexity class", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Nguyen Van A");
    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password1");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "password1");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByText(
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character"
      )
    ).toBeInTheDocument();
  });

  test("AUTH001-4: blocks Continue on confirm-password mismatch", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Nguyen Van A");
    await user.type(screen.getByPlaceholderText("you@company.com"), "hr@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Password2!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });

  test("AUTH001-5: valid input advances to step 2", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await goToStep2(user);
    expect(screen.getByPlaceholderText("Acme Corp")).toBeInTheDocument();
  });
});

describe("AUTH001 — Register HR, step 2", () => {
  test("AUTH001-6: blocks submit when not agreed to terms", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await goToStep2(user);
    await user.type(screen.getByPlaceholderText("Acme Corp"), "Tech ABC");
    await user.type(screen.getByPlaceholderText("e.g. HR Specialist"), "HR Manager");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByText("You must agree to the terms")).toBeInTheDocument();
    expect(registerHr).not.toHaveBeenCalled();
  });

  test("AUTH001-7: blocks submit when company name or job title is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await goToStep2(user);
    await user.click(document.querySelector("button.auth-checkbox")!);
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByText("Company name is required")).toBeInTheDocument();
    expect(screen.getByText("Job title is required")).toBeInTheDocument();
  });

  test("AUTH001-8: valid submit redirects to /verify-email", async () => {
    vi.mocked(registerHr).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await goToStep2(user);
    await user.type(screen.getByPlaceholderText("Acme Corp"), "Tech ABC");
    await user.type(screen.getByPlaceholderText("e.g. HR Specialist"), "HR Manager");
    await user.click(document.querySelector("button.auth-checkbox")!);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const target = push.mock.calls[0][0] as string;
    expect(target).toContain("/verify-email");
    expect(target).toContain("email=hr%40example.com");
  });

  test("AUTH001-9: duplicate email (409) jumps back to step 1 with an inline error", async () => {
    vi.mocked(registerHr).mockRejectedValueOnce({
      response: { status: 409, data: { message: "email already exists" } },
    });
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);
    await goToStep2(user);
    await user.type(screen.getByPlaceholderText("Acme Corp"), "Tech ABC");
    await user.type(screen.getByPlaceholderText("e.g. HR Specialist"), "HR Manager");
    await user.click(document.querySelector("button.auth-checkbox")!);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    // rp.title is rendered word-by-word in separate <span>s — see the
    // "Your Profile" note above for why \s* is needed under jsdom.
    expect(await screen.findByRole("heading", { name: /Create\s*your\s*account/ })).toBeInTheDocument();
    expect(screen.getByText("This email is already registered.")).toBeInTheDocument();
  });
});
