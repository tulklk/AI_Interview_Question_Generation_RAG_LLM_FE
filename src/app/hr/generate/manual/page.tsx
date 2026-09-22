"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { ManualQuestionPage } from "@/features/interview/components/generate/manual-question-page";
import { useLanguage } from "@/shared/providers/language-context";

/**
 * SCRUM-477: Tạo câu hỏi thủ công nhanh (Bulk UX).
 * Question Builder chi tiết vẫn ở /hr/generate-question/manual.
 */
export default function HrGenerateManualPage() {
  const { t } = useLanguage();
  const title = t.appShell.routes["/hr/generate/manual"];

  return (
    <AppShell
      pageTitle={title}
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        {
          label: t.appShell.routes["/hr/generate-question"],
          href: "/hr/generate-question",
        },
        { label: title },
      ]}
    >
      <ManualQuestionPage />
    </AppShell>
  );
}
