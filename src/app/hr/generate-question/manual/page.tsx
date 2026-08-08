"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";
import { useLanguage } from "@/shared/providers/language-context";

/** SCRUM-397: Question Builder — soạn câu hỏi thủ công theo luồng HR */
export default function HrGenerateQuestionManualRoute() {
  const { t } = useLanguage();
  const title = t.appShell.routes["/hr/generate-question/manual"];

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
      <QuestionBuilderPage />
    </AppShell>
  );
}
