import { AppShell } from "@/components/layout/app-shell";
import { GenerateForm } from "@/components/generate/generate-form";

export default function GeneratePage() {
  return (
    <AppShell
      pageTitle="Generate Questions"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Generate" }]}
    >
      <div className="max-w-4xl mx-auto animate-fade-up">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Generate Interview Questions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Paste your job description or upload a file to get AI-powered,
            role-specific questions instantly.
          </p>
        </div>

        <GenerateForm />
      </div>
    </AppShell>
  );
}
