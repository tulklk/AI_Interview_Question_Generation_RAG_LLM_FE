"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { LanguageProvider } from "@/context/language-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { UserProvider } from "@/context/user-context";
import { ToastContainer } from "@/components/ui/toast-container";
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
