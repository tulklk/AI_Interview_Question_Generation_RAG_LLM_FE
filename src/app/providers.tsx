"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { LanguageProvider } from "@/shared/providers/language-context";
import { ThemeProvider } from "@/shared/providers/theme-context";
import { ToastProvider } from "@/shared/providers/toast-context";
import { UserProvider } from "@/features/auth/context/user-context";
import { ToastContainer } from "@/shared/components/ui/toast-container";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  return (
    <GoogleOAuthProvider clientId={clientId}>
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
    </GoogleOAuthProvider>
  );
}
