"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { ManualQuestionPage } from "@/features/interview/components/generate/manual-question-page";
import { useLanguage } from "@/shared/providers/language-context";

export default function HrGenerateManualPage() {
  const { t } = useLanguage();

  return (
    <AppShell
      pageTitle={t.manualPage.heading}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: t.generatePage.heading, href: "/hr/generate" },
        { label: t.manualPage.heading },
      ]}
    >
      <ManualQuestionPage />
    </AppShell>
  );
}
