"use client";

// GoogleOAuthProvider is intentionally NOT in the root providers.
// Loading the Google GSI script (accounts.google.com/gsi/client) on every page
// wastes ~81 KiB on pages that never use Google login (marketing, dashboard, etc.).
// It is mounted in AuthLayout instead, so it only loads on login/register routes.
import { LanguageProvider } from "@/shared/providers/language-context";
import { ThemeProvider } from "@/shared/providers/theme-context";
import { ThemeTransitionProvider } from "@/shared/providers/theme-transition-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { UserProvider } from "@/features/auth/context/user-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";
import { NetworkOfflineOverlay } from "@/shared/components/ui/network-offline-overlay";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeTransitionProvider>
        <LanguageProvider>
          <ToastProvider>
            <UserProvider>
              {children}
              <ToastContainer />
              <NetworkOfflineOverlay />
            </UserProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeTransitionProvider>
    </ThemeProvider>
  );
}
