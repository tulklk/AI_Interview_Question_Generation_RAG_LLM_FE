import { LoginHero } from "@/components/auth/login-hero";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="hidden lg:flex w-[55%] shrink-0 bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] animate-slide-left">
        <LoginHero />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-y-auto animate-slide-right">
        <LoginForm />
      </div>
    </div>
  );
}
