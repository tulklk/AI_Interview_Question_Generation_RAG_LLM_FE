"use client";

import { Suspense } from "react";
import { AuthPageToolbar } from "@/features/auth/components/auth-page-toolbar";
import { ResetPasswordContent } from "@/features/auth/components/reset-password-content";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-950 px-8">
      <div className="absolute top-6 right-8">
        <AuthPageToolbar />
      </div>
      <Suspense>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
