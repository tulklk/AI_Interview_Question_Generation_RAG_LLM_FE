import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthLayout } from "@/features/auth/components/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
