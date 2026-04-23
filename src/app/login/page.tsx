import { LoginHero } from "@/components/auth/login-hero";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function LoginPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="hidden lg:flex w-[55%] shrink-0 bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] animate-slide-left">
        <LoginHero />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-y-auto animate-slide-right">
        <div className="absolute top-6 right-8 animate-fade-in">
          <BrandLogo
            className="justify-end"
            logoClassName="w-10 h-10"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
