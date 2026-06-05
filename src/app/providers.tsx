"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { LanguageProvider } from "@/context/language-context";
import { ToastProvider } from "@/context/toast-context";
import { ToastContainer } from "@/components/ui/toast-container";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LanguageProvider>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  );
}
