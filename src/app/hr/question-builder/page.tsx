"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { QuestionBuilderPage } from "@/features/interview/components/generate/question-builder-page";
import { useLanguage } from "@/shared/providers/language-context";

/** SCRUM-397: Question Builder — soạn câu hỏi thủ công theo luồng HR */
export default function HrQuestionBuilderRoute() {
  const { t } = useLanguage();
  const title =
    t.appShell.routes["/hr/question-builder"] ??
    t.sidebar.nav["/hr/question-builder"] ??
    "Question Builder";

  return (
    <AppShell
      pageTitle={title}
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        { label: title },
      ]}
    >
      <QuestionBuilderPage />
    </AppShell>
  );
}
