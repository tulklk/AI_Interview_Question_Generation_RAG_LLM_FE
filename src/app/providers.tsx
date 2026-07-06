"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { LanguageProvider } from "@/shared/providers/language-context";
import { ThemeProvider } from "@/shared/providers/theme-context";
import { ThemeTransitionProvider } from "@/shared/providers/theme-transition-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { UserProvider } from "@/features/auth/context/user-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";
import { NetworkOfflineOverlay } from "@/shared/components/ui/network-offline-overlay";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  return (
    <GoogleOAuthProvider clientId={clientId}>
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
    </GoogleOAuthProvider>
  );
}
