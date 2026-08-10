import { test, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithAppShell } from "./app-shell-test-utils";
import { renderWithProviders } from "./test-utils";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";

// Grounded in app-shell.tsx (the outer `overflow-hidden` wrapper + `<main
// overflow-x-hidden>`) and auth-layout.tsx (the outer `overflow-hidden`
// wrapper) — the actual CSS mechanism that keeps the page from ever
// scrolling sideways regardless of content width or viewport size. Maps to
// Excel sheets UI003/UI007 (both routed through the same AppShell) and
// UI010/UI017 (login page). Unit-test rewrite of ui-visual-layout.spec.ts's
// and ui-visual-layout-3.spec.ts's viewport-loop overflow assertions.
//
// jsdom has no real layout engine (scrollWidth/clientWidth are always 0),
// so a `scrollWidth <= clientWidth` assertion in jsdom is vacuously true
// regardless of actual CSS and verifies nothing — these tests check the
// responsible classes are actually applied instead, which is the
// closest honest proxy available without a real browser. The four-viewport
// parametrization from the original spec doesn't carry over either: jsdom's
// matchMedia stub always reports `matches: false` (see vitest.setup.ts), so
// there is no way to make the app behave differently per viewport size here.

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

test("UI003/UI007: the AppShell page frame clips horizontal overflow at any content width", async () => {
  localStorage.setItem("interviewai_auth", "true");
  localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-tests");
  localStorage.setItem("interviewai_user_role", "HR_MANAGER");

  renderWithAppShell(
    <AppShell pageTitle="Create questions manually">
      <QuestionBuilderPage />
    </AppShell>
  );
  const heading = await screen.findByRole("heading", { name: "Create questions manually" }, { timeout: 10000 });

  const outerShell = document.querySelector<HTMLElement>("div.flex.h-screen.overflow-hidden")!;
  expect(outerShell).toBeInTheDocument();
  const main = heading.closest("main");
  expect(main?.className).toContain("overflow-x-hidden");
});

test("UI010/UI017: the auth page frame clips horizontal overflow on the login page", async () => {
  renderWithProviders(
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
  await screen.findByPlaceholderText("you@company.com", {}, { timeout: 10000 });

  const outerShell = document.querySelector(".auth-page");
  expect(outerShell).toHaveClass("overflow-hidden");
}, 15000);
