"use client";

import { Suspense } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ResetPasswordContent } from "@/components/auth/reset-password-content";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-white px-8">
      <div className="absolute top-6 right-8">
        <BrandLogo
          className="justify-end"
          logoClassName="w-10 h-10"
          titleClassName="text-[16px]"
          subtitleClassName="text-[11px]"
        />
      </div>
      <Suspense>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
