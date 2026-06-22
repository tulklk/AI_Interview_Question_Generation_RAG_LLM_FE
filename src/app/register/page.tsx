import { RegisterRoleTabs } from "@/components/auth/register-role-tabs";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata = {
  title: "Sign Up — HireGen AI",
  description:
    "Create your free HireGen AI account and start generating tailored interview questions from job descriptions in seconds.",
};

export default function RegisterPage() {
  return (
    <AuthLayout formAreaClassName="items-start justify-center">
      <RegisterRoleTabs />
    </AuthLayout>
  );
}
