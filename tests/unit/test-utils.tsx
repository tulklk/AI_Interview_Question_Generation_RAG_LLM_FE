import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { LanguageProvider } from "@/shared/providers/language-context";
import { ThemeProvider } from "@/shared/providers/theme-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { UserProvider } from "@/features/auth/context/user-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";

/**
 * Mirrors src/app/providers.tsx minus GoogleOAuthProvider (its script-tag
 * injection doesn't play well with jsdom and no covered test needs it) and
 * ThemeTransitionProvider/NetworkOfflineOverlay (no test depends on either).
 */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <UserProvider>
            {children}
            <ToastContainer />
          </UserProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: AllProviders });
}

export * from "@testing-library/react";
