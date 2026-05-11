import { LoginHero } from "@/components/auth/login-hero";
import { RegisterForm } from "@/components/auth/register-form";
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

      {/* Right panel — register form */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-y-auto animate-slide-right">
        <div className="absolute top-6 right-8 animate-fade-in">
          <BrandLogo
            className="justify-end"
            logoClassName="w-10 h-10"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
