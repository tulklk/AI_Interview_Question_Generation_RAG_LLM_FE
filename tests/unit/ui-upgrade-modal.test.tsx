import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { renderWithAppShell } from "./app-shell-test-utils";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";

// Grounded in src/features/hr/components/billing/hr-upgrade-modal.tsx
// (Escape/backdrop close, body scroll lock) and sidebar.tsx (the "Upgrade
// Plan ->" trigger button). Maps to Excel sheet UI003 (modals). Unit-test
// rewrite of ui-visual-layout-2.spec.ts's UI003-1/2/3 — needs the real
// Sidebar (not just the page component), so it renders through the actual
// AppShell via renderWithAppShell() instead of the bare-page pattern most
// other unit tests use.

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

beforeEach(() => {
  localStorage.setItem("interviewai_auth", "true");
  localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-tests");
  localStorage.setItem("interviewai_user_role", "HR_MANAGER");
});

async function renderPage() {
  const user = userEvent.setup();
  renderWithAppShell(
    <AppShell pageTitle="Create questions manually">
      <QuestionBuilderPage />
    </AppShell>
  );
  await screen.findByRole("heading", { name: "Create questions manually" }, { timeout: 10000 });
  return user;
}

describe("UI003 — HR upgrade modal", () => {
  test("UI003-1: the upgrade modal locks body scroll while open and restores it on close", async () => {
    const user = await renderPage();

    expect(document.body.style.overflow).not.toBe("hidden");

    // The button's accessible name concatenates the plan name + upgrade
    // text (both rendered as child <p> elements), so it isn't exactly
    // "Upgrade Plan →" on its own.
    await user.click(screen.getByRole("button", { name: /Upgrade Plan/ }));
    expect(await screen.findByText("HR Subscription Plans", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    // hr-upgrade-modal.tsx's outer wrapper is `fixed inset-0 z-9999` (Tailwind
    // v4 bare-number utility, not the old v3 `z-[9999]` arbitrary-value syntax).
    const modal = document.querySelector<HTMLElement>("div.fixed.inset-0.z-9999")!;
    await user.click(within(modal).getAllByRole("button")[0]);
    await vi.waitFor(() => expect(screen.queryByText("HR Subscription Plans")).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe("");
  });

  test("UI003-2: pressing Escape closes the upgrade modal", async () => {
    const user = await renderPage();
    // The button's accessible name concatenates the plan name + upgrade
    // text (both rendered as child <p> elements), so it isn't exactly
    // "Upgrade Plan →" on its own.
    await user.click(screen.getByRole("button", { name: /Upgrade Plan/ }));
    expect(await screen.findByText("HR Subscription Plans", {}, { timeout: 5000 })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByText("HR Subscription Plans")).not.toBeInTheDocument());
  });

  test("UI003-3: clicking the backdrop closes the upgrade modal", async () => {
    const user = await renderPage();
    // The button's accessible name concatenates the plan name + upgrade
    // text (both rendered as child <p> elements), so it isn't exactly
    // "Upgrade Plan →" on its own.
    await user.click(screen.getByRole("button", { name: /Upgrade Plan/ }));
    expect(await screen.findByText("HR Subscription Plans", {}, { timeout: 5000 })).toBeInTheDocument();

    const backdrop = document.querySelector<HTMLElement>("div.fixed.inset-0.z-9999 > div.absolute.inset-0") ??
      document.querySelector<HTMLElement>("div.fixed.inset-0.z-9999")!;
    await user.click(backdrop);
    await vi.waitFor(() => expect(screen.queryByText("HR Subscription Plans")).not.toBeInTheDocument());
  });

  test("UI013-1: the upgrade modal carries the z-9999 stacking class, with no competing z-index elsewhere in the shell", async () => {
    // jsdom has no real CSS cascade/layout engine, so a genuine
    // getComputedStyle().zIndex assertion (what
    // ui-visual-layout-6.spec.ts's UI013-1 checked) can't be reproduced
    // meaningfully here — this instead verifies the actual mechanism: the
    // modal carries Tailwind's z-9999 utility, and the sidebar (the only
    // other persistently-mounted chrome around it) sets no competing
    // z-index class of its own.
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: /Upgrade Plan/ }));
    const modal = await screen.findByText("HR Subscription Plans", {}, { timeout: 5000 });
    const modalRoot = modal.closest<HTMLElement>("div.fixed.inset-0.z-9999");
    expect(modalRoot).toBeInTheDocument();

    const sidebar = document.querySelector("aside")!;
    expect(sidebar.className).not.toMatch(/\bz-\d+\b/);
  });
});
