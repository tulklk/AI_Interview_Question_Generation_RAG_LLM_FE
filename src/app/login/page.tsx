import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthLayout } from "@/features/auth/components/auth-layout";

export const metadata = {
  title: "Sign In — HireGen AI",
  description: "Sign in to your HireGen AI account to generate interview questions.",
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
