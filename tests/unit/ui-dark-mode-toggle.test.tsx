import type { ReactElement, ReactNode } from "react";
import { test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/shared/providers/theme-context";
import { LanguageProvider } from "@/shared/providers/language-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { UserProvider } from "@/features/auth/context/user-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";
import { HrSubscriptionProvider } from "@/features/hr/context/hr-subscription-context";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { StudioPage } from "@/features/studio/components/studio-page";
import {
  studioServiceMockFactory,
  bootstrapStudio,
  freeSubscriptionReady,
  getMockedGetMySubscription,
} from "./studio-test-utils";

// Grounded in theme-context.tsx (STORAGE_KEY="hiregena-theme", applies a
// "dark" class to <html>). Maps to Excel sheet UI004. Unit-test rewrite of
// ui-visual-layout-3.spec.ts's UI004-1 — needs the real AppShell/TopHeader
// (ThemeToggle lives there), so it defines its own provider tree rather
// than reusing app-shell-test-utils.tsx (which mocks studio.service
// minimally; this test needs the full StudioPage mock surface instead, and
// a module can only be vi.mock()'d once per file).
//
// theme-transition-context.tsx's real ThemeTransitionProvider only fires
// the actual theme flip from a CSS animationend handler on its transition
// overlay — jsdom never fires that for a real animation. The module's own
// out-of-Provider default context value already models the "no visual
// transition" case (run the callback immediately, synchronously) — that's
// the behavior under test here anyway (does the toggle flip the theme?,
// not the transition animation itself), so the module is mocked to that
// default rather than fighting jsdom over animation events.
vi.mock("@/shared/providers/theme-transition-context", () => ({
  ThemeTransitionProvider: ({ children }: { children: ReactNode }) => children,
  useThemeTransition: () => ({
    triggerTransition: (onMidpoint: () => void) => onMidpoint(),
    isTransitioning: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/hr/generate-question",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/studio/services/studio.service", async () => {
  const mod = await import("./studio-test-utils");
  return mod.studioServiceMockFactory();
});

import * as studioApiTyped from "@/features/studio/services/studio.service";
const studioApi = studioApiTyped as unknown as ReturnType<typeof studioServiceMockFactory>;

function AppShellProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <UserProvider>
            <HrSubscriptionProvider>
              {children}
              <ToastContainer />
            </HrSubscriptionProvider>
          </UserProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function renderWithAppShellFresh(ui: ReactElement) {
  return render(ui, { wrapper: AppShellProviders });
}

beforeEach(async () => {
  Object.values(studioApi).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  });
  (await getMockedGetMySubscription()).mockReset();
  (await getMockedGetMySubscription()).mockResolvedValue(freeSubscriptionReady() as never);
  localStorage.setItem("interviewai_auth", "true");
  localStorage.setItem("interviewai_access_token", "fake.jwt.token-for-tests");
  localStorage.setItem("interviewai_user_role", "HR_MANAGER");
});

test("UI004-1: the AppShell dark mode toggle applies and persists across reload", async () => {
  bootstrapStudio(studioApi as never, {});
  const user = userEvent.setup();
  const { unmount } = renderWithAppShellFresh(
    <AppShell pageTitle="Interview Plan Studio">
      <StudioPage />
    </AppShell>
  );
  await screen.findByRole("button", { name: "Create Plan" }, { timeout: 10000 });

  expect(document.documentElement.classList.contains("dark")).toBe(false);

  await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));

  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("hiregena-theme")).toBe("dark");

  // Simulate a page reload: unmount and remount a fresh ThemeProvider tree,
  // which reads localStorage on its own initial-hydration effect.
  unmount();
  renderWithAppShellFresh(
    <AppShell pageTitle="Interview Plan Studio">
      <StudioPage />
    </AppShell>
  );
  await screen.findByRole("button", { name: "Create Plan" }, { timeout: 10000 });
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});
