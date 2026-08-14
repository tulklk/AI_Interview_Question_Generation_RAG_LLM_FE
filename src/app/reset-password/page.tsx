"use client";

import { Suspense } from "react";
import { BrandLogo } from "@/shared/components/common/brand-logo";
import { ResetPasswordContent } from "@/features/auth/components/reset-password-content";
import { useLanguage } from "@/shared/providers/language-context";
import { useDocumentTitle } from "@/shared/hooks/use-document-title";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  useDocumentTitle(t.resetPasswordPage.title);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Animated background — identical to forgot-password page */}
      <div className="animated-bg-stack fixed inset-0 z-0 pointer-events-none isolate" aria-hidden="true">
        <div className="animated-bg-layer animated-bg-layer--a" />
        <div className="animated-bg-layer animated-bg-layer--b" />
        <div className="aurora-mesh" />
        <div className="bg-grid-pattern" />
      </div>
      <div className="fixed inset-0 z-0 pointer-events-none isolate" aria-hidden="true">
        <div className="holo-orb holo-orb--purple" style={{ width: 520, height: 520, top: "-12%", left: "-8%" }} />
        <div className="holo-orb holo-orb--blue"   style={{ width: 420, height: 420, top: "20%",  right: "-6%" }} />
        <div className="holo-orb holo-orb--pink"   style={{ width: 360, height: 360, top: "65%",  left: "5%" }} />
      </div>

      {/* Brand logo only — no theme toggle */}
      <div className="absolute top-6 right-8 z-10 animate-fade-in">
        <BrandLogo
          className="justify-end"
          logoClassName="w-10 h-10"
          titleClassName="text-[16px]"
          subtitleClassName="text-[11px]"
        />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm mx-auto animate-fade-up bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-gray-700/50 shadow-xl shadow-violet-100/40 dark:shadow-none p-8">
          <Suspense>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
