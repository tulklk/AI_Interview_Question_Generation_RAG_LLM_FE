import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { RegisterJobSeekerForm } from "@/features/auth/components/register-jobseeker-form";

// Grounded in src/features/auth/components/register-jobseeker-form.tsx and
// src/core/i18n/en.ts (`registerJobSeekerPage` section). Maps to Excel sheet
// AUTH003_RegisterJobSeeker. Unit-test rewrite of the former
// register-jobseeker.spec.ts Playwright suite.
// Note: step1/step2 field-required messages ("Họ tên là bắt buộc", "Vui lòng
// nhập email hợp lệ", etc.) are hard-coded Vietnamese in the component
// itself, not pulled from an i18n dictionary — that's real current behavior.

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/register/jobseeker",
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  registerCandidate: vi.fn(),
}));

import { registerCandidate } from "@/features/auth/services/auth.service";

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("John Doe"), "Tran Thi B");
  await user.type(screen.getByPlaceholderText("you@example.com"), "candidate@example.com");
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
  vi.mocked(registerCandidate).mockReset();
});

describe("AUTH003 — Register Jobseeker, step 1", () => {
  test("AUTH003-1: blocks Continue when full name is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "candidate@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Họ tên là bắt buộc")).toBeInTheDocument();
  });

  test("AUTH003-2: blocks Continue on invalid email format", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Tran Thi B");
    await user.type(screen.getByPlaceholderText("you@example.com"), "not-an-email");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Vui lòng nhập email hợp lệ")).toBeInTheDocument();
  });

  test("AUTH003-3: blocks Continue when password is under 8 characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Tran Thi B");
    await user.type(screen.getByPlaceholderText("you@example.com"), "candidate@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Pw1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Pw1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  test("AUTH003-4: blocks Continue when password is missing a complexity class", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Tran Thi B");
    await user.type(screen.getByPlaceholderText("you@example.com"), "candidate@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password1");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "password1");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByText(
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character"
      )
    ).toBeInTheDocument();
  });

  test("AUTH003-5: blocks Continue on confirm-password mismatch", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await user.type(screen.getByPlaceholderText("John Doe"), "Tran Thi B");
    await user.type(screen.getByPlaceholderText("you@example.com"), "candidate@example.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Different1!");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });

  test("AUTH003-6: valid input advances to step 2", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await goToStep2(user);
    expect(screen.getByPlaceholderText("e.g. Frontend Developer")).toBeInTheDocument();
  });
});

describe("AUTH003 — Register Jobseeker, step 2", () => {
  test("AUTH003-7: blocks submit when target role, seniority, and tech stack are all empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await goToStep2(user);
    const form = screen.getByPlaceholderText("e.g. Frontend Developer").closest("form")!;
    form.requestSubmit();

    expect(await screen.findByText("Vị trí mục tiêu là bắt buộc")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng chọn cấp độ kinh nghiệm")).toBeInTheDocument();
    expect(screen.getByText("Chọn ít nhất một công nghệ")).toBeInTheDocument();
  });

  async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("e.g. Frontend Developer"), "Backend Developer");
    await user.selectOptions(screen.getByRole("combobox"), "Junior");
    await user.click(screen.getByPlaceholderText("Search technologies..."));
    await user.click(screen.getByRole("button", { name: "Node.js" }));
  }

  test("AUTH003-8: valid submit redirects to /verify-email", async () => {
    vi.mocked(registerCandidate).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await goToStep2(user);
    await fillStep2(user);
    const form = screen.getByPlaceholderText("e.g. Frontend Developer").closest("form")!;
    form.requestSubmit();

    await waitFor(() => expect(push).toHaveBeenCalled());
    const target = push.mock.calls[0][0] as string;
    expect(target).toContain("/verify-email");
    expect(target).toContain("email=candidate%40example.com");
  });

  test("AUTH003-9: duplicate email (409) jumps back to step 1 with an inline error", async () => {
    vi.mocked(registerCandidate).mockRejectedValueOnce({
      response: { status: 409, data: { message: "email already registered" } },
    });
    const user = userEvent.setup();
    renderWithProviders(<RegisterJobSeekerForm />);
    await goToStep2(user);
    await fillStep2(user);
    const form = screen.getByPlaceholderText("e.g. Frontend Developer").closest("form")!;
    form.requestSubmit();

    // "Account Information" is just the always-visible step-indicator label,
    // not a heading — the real step-1 content heading is "Create your account".
    // rp.title is rendered word-by-word in separate <span>s — see the
    // "Your Profile" note above for why \s* is needed under jsdom.
    expect(await screen.findByRole("heading", { name: /Create\s*your\s*account/ })).toBeInTheDocument();
    expect(screen.getByText("This email is already registered.")).toBeInTheDocument();
  });
});
