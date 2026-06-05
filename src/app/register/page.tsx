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
      {/* Left hero — reuse the same gradient panel as login */}
      <div className="hidden lg:flex w-[55%] shrink-0 bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] animate-slide-left">
        <LoginHero />
      </div>

      {/* Right panel — logo in header row, form scrolls below */}
      <div className="relative flex-1 flex flex-col min-h-0 animate-slide-right">
        <div className="shrink-0 flex justify-end px-6 sm:px-8 pt-6 pb-4 animate-fade-in">
          <BrandLogo
            className="justify-end max-w-[min(100%,280px)]"
            logoClassName="w-10 h-10"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-10">
          <div className="w-full max-w-sm mx-auto pt-2 sm:pt-4">
            <RegisterRoleTabs />
          </div>
        </div>
      </div>
    </div>
  );
}
