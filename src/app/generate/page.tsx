"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GenerateForm } from "@/components/generate/generate-form";
import { useLanguage } from "@/context/language-context";

export default function GeneratePage() {
  const { t } = useLanguage();
  const gp = t.generatePage;

  return (
    <AppShell
      pageTitle={gp.heading}
      breadcrumb={[{ label: "Home", href: "/" }, { label: gp.heading }]}
    >
      <div className="max-w-4xl mx-auto animate-fade-up">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{gp.heading}</h2>
          <p className="text-sm text-gray-500 mt-1">{gp.subtext}</p>
        </div>

        <GenerateForm />
      </div>
    </AppShell>
  );
}
