import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithAppShell } from "./app-shell-test-utils";
import { renderWithProviders } from "./test-utils";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthLayout } from "@/features/auth/components/auth-layout";

// Grounded in sidebar.tsx (mobile drawer aria-hidden toggle, driven by
// AppShell's sidebarOpen state) and brand-logo.tsx (shared component reused
// by both the public login page and the HR sidebar). Maps to Excel sheets
// UI012 (sidebar responsive) and UI018 (branding consistency). Unit-test
// rewrite of ui-visual-layout-4.spec.ts's UI012-1/UI018-1.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/hr/generate-question/manual",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/hr/services/hr-history.service", () => ({
  listHistoryQuestionSets: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/interview/services/interview.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/interview/services/interview.service")>();
  return { ...actual, addQuestionSetQuestion: vi.fn(), createManualDraftQuestionSet: vi.fn(), uploadQuestionSetQuestionImage: vi.fn() };
});

vi.mock("@/features/auth/services/auth.service", () => ({ login: vi.fn(), resendVerification: vi.fn() }));
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn().mockRejectedValue(new Error("not authenticated")) }));

beforeEach(() => {
  localStorage.setItem("interviewai_auth", "true");
  localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-tests");
  localStorage.setItem("interviewai_user_role", "HR_MANAGER");
});

test("UI012-1: the mobile sidebar drawer starts hidden, opens via the hamburger, and closes via the backdrop", async () => {
  const user = userEvent.setup();
  renderWithAppShell(
    <AppShell pageTitle="Create questions manually">
      <QuestionBuilderPage />
    </AppShell>
  );
  await screen.findByRole("heading", { name: "Create questions manually" }, { timeout: 10000 });

  const drawer = document.querySelector<HTMLElement>("div.lg\\:hidden.fixed.inset-0.z-40")!;
  expect(drawer).toHaveAttribute("aria-hidden", "true");

  await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
  expect(drawer).toHaveAttribute("aria-hidden", "false");
  expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();

  // The backdrop is the semi-transparent overlay CHILD div with the
  // onClick=onClose handler — not the drawer's outer wrapper (which also
  // contains the slide-in panel, so clicking the wrapper node directly
  // never bubbles into the backdrop's own onClick).
  const backdrop = drawer.querySelector<HTMLElement>("div.absolute.inset-0.bg-black\\/50")!;
  await user.click(backdrop);
  expect(drawer).toHaveAttribute("aria-hidden", "true");
});

describe("UI018 — brand logo consistency", () => {
  test("UI018-1: the same HireGen AI logo asset renders on the public login page and inside the HR sidebar", async () => {
    const { unmount } = renderWithProviders(
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    );
    const loginLogo = await screen.findByAltText("HireGen AI", {}, { timeout: 10000 });
    expect(loginLogo).toHaveAttribute("src", expect.stringContaining("logo.png"));
    unmount();

    renderWithAppShell(
      <AppShell pageTitle="Create questions manually">
        <QuestionBuilderPage />
      </AppShell>
    );
    await screen.findByRole("heading", { name: "Create questions manually" }, { timeout: 10000 });
    // Both the desktop sidebar and the (CSS-hidden) mobile drawer render
    // their own copy of BrandLogo simultaneously — scope to the first.
    const sidebarLogo = screen.getAllByAltText("HireGen AI")[0];
    expect(sidebarLogo).toHaveAttribute("src", expect.stringContaining("logo.png"));
  });
});
