import { LoginHero } from "@/components/auth/login-hero";
import { RegisterRoleTabs } from "@/components/auth/register-role-tabs";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata = {
  title: "Sign Up — HireGen AI",
  description:
    "Create your free HireGen AI account and start generating tailored interview questions from job descriptions in seconds.",
};

export default function RegisterPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left — hero gradient panel */}
      <div className="hidden lg:flex w-[55%] shrink-0 bg-linear-to-br from-primary to-[#8b65ff] animate-slide-left">
        <LoginHero />
      </div>

      {/* Right — form panel with animated background orbs */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden animate-slide-right">
        {/* Decorative background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="auth-panel-orb auth-panel-orb--1" style={{ width: 360, height: 360, top: -80, right: -70 }} />
          <div className="auth-panel-orb auth-panel-orb--2" style={{ width: 300, height: 300, bottom: -80, left: -60 }} />
          <div className="auth-panel-orb auth-panel-orb--3" style={{ width: 220, height: 220, top: "42%", right: "16%" }} />
        </div>

        {/* Brand logo row */}
        <div className="relative z-10 shrink-0 flex justify-end px-6 sm:px-8 pt-6 pb-4 animate-fade-in">
          <BrandLogo
            className="justify-end max-w-[min(100%,280px)]"
            logoClassName="w-10 h-10"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>

        {/* Scrollable form area */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-8 pb-10">
          <div className="w-full max-w-sm mx-auto pt-2 sm:pt-4">
            <RegisterRoleTabs />
          </div>
        </div>
      </div>
    </div>
  );
}
