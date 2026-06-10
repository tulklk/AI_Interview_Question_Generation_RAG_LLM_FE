import { Suspense } from "react";
import { LoginHero } from "@/components/auth/login-hero";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function LoginPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left — hero gradient panel */}
      <div className="hidden lg:flex w-[55%] shrink-0 bg-linear-to-br from-primary to-[#8b65ff] animate-slide-left">
        <LoginHero />
      </div>

      {/* Right — form panel with animated background orbs */}
      <div className="relative flex-1 overflow-hidden animate-slide-right">
        {/* Decorative background orbs (very subtle on white bg) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="auth-panel-orb auth-panel-orb--1" style={{ width: 360, height: 360, top: -80, right: -70 }} />
          <div className="auth-panel-orb auth-panel-orb--2" style={{ width: 300, height: 300, bottom: -80, left: -60 }} />
          <div className="auth-panel-orb auth-panel-orb--3" style={{ width: 220, height: 220, top: "40%", right: "16%" }} />
        </div>

        {/* Brand logo — pinned top-right */}
        <div className="absolute top-6 right-8 z-10 animate-fade-in">
          <BrandLogo
            className="justify-end"
            logoClassName="w-10 h-10"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>

        {/* Scrollable form area */}
        <div className="relative h-full flex flex-col items-center justify-center px-8 py-10 overflow-y-auto z-10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
