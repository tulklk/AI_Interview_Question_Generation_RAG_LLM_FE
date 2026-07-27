"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { PractitionersPage } from "@/features/interview/components/practitioners/practitioners-page";
import { useLanguage } from "@/shared/providers/language-context";

export default function HrPractitionersRoute() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { t } = useLanguage();
  const p = t.practitionersPage;

  return (
    <AppShell
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: t.historyPage.heading, href: "/hr/history" },
        { label: p.heading },
      ]}
      pageTitle={p.heading}
    >
      <PractitionersPage questionSetId={id} />
    </AppShell>
  );
}
