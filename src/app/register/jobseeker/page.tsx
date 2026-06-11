import { LoginHero } from "@/components/auth/login-hero";
import { RegisterJobSeekerForm } from "@/components/auth/register-jobseeker-form";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata = {
  title: "Sign Up — HireGen AI",
  description:
    "Create your free HireGen AI account and start practising with AI-powered interview questions.",
};

export default function RegisterJobSeekerPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <div className="hidden lg:flex w-[55%] shrink-0 bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] animate-slide-left">
        <LoginHero />
      </div>

      <div className="relative flex-1 animate-slide-right">
        <div className="absolute top-6 right-8 animate-fade-in z-10">
          <BrandLogo
            className="justify-end"
            logoClassName="w-10 h-10"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>
        <div className="h-full flex flex-col items-center justify-center px-8 pt-20 pb-10 overflow-y-auto">
          <RegisterJobSeekerForm />
        </div>
      </div>
    </div>
  );
}
