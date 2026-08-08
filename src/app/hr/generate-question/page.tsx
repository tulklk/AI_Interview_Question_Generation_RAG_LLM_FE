"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { StudioPage } from "@/features/studio/components/studio-page";
import { useLanguage } from "@/shared/providers/language-context";

export default function HrGenerateQuestionPage() {
  const { t } = useLanguage();
  const title =
    t.appShell.routes["/hr/generate-question"] ??
    t.sidebar.nav["/hr/generate-question"] ??
    "Generate question set";

  return (
    <AppShell
      pageTitle={title}
      fullWidth
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        { label: title },
      ]}
    >
      <div className="animate-fade-up">
        <StudioPage />
      </div>
    </AppShell>
  );
}
