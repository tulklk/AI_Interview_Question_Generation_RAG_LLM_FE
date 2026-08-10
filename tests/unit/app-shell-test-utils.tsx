import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@/shared/providers/theme-context";
import { ThemeTransitionProvider } from "@/shared/providers/theme-transition-context";
import { LanguageProvider } from "@/shared/providers/language-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { UserProvider } from "@/features/auth/context/user-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";
import { HrSubscriptionProvider } from "@/features/hr/context/hr-subscription-context";

// Shared render helper for tests that need the REAL AppShell (Sidebar +
// TopHeader), not just a bare page component — e.g. the HR upgrade modal
// (triggered from the Sidebar), the mobile drawer, or logo consistency
// across the sidebar. AppShell pulls in more machinery than a standalone
// page: HrSubscriptionProvider (plan badge), listProjects (notification
// bell), and — via ThemeToggle — ThemeTransitionProvider.
//
// AppShell itself always calls listProjects() on mount for its
// notification bell; mock it minimally here so tests that don't care about
// notifications don't have to. Studio-page-heavy tests that need the FULL
// studio.service surface (e.g. the dark-mode test, which renders StudioPage
// inside AppShell) mock this module themselves instead of importing this
// file, since a module can only be vi.mock()'d once per test file.
vi.mock("@/features/studio/services/studio.service", () => ({
  listProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/subscription/services/subscription.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/subscription/services/subscription.service")>();
  return {
    ...actual,
    getMySubscription: vi.fn().mockResolvedValue({
      planCode: "HR_FREE", status: "Active", cooldownExpiresAt: null, dailyQuotaUsed: 0, dailyQuotaLimit: 5,
    } as never),
    listSubscriptionPlans: vi.fn().mockResolvedValue([]),
    createUpgradePaymentOrder: vi.fn(),
    getUpgradePaymentStatus: vi.fn(),
  };
});

function AppShellProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeTransitionProvider>
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
      </ThemeTransitionProvider>
    </ThemeProvider>
  );
}

export function renderWithAppShell(ui: ReactElement) {
  return render(ui, { wrapper: AppShellProviders });
}
