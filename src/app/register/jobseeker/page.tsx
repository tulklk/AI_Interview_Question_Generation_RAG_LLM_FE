import { RegisterJobSeekerForm } from "@/features/auth/components/register-jobseeker-form";
import { AuthLayout } from "@/features/auth/components/auth-layout";

export const metadata = {
  title: "Sign Up — HireGen AI",
  description:
    "Create your free HireGen AI account and start practising with AI-powered interview questions.",
};

export default function RegisterJobSeekerPage() {
  return (
    <AuthLayout formAreaClassName="items-start justify-center">
      <RegisterJobSeekerForm />
    </AuthLayout>
  );
}
