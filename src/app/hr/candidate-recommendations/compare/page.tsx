"use client";

import { Suspense } from "react";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { CompareRecommendationsPage } from "@/features/hr/components/recommendations/compare-recommendations";
import { useLanguage } from "@/shared/providers/language-context";

export default function HrComparePage() {
  const { t } = useLanguage();
  return (
    <AppShell
      pageTitle={t.hrRecommendationsPage.compareTitle}
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        {
          label: t.appShell.routes["/hr/candidate-recommendations"],
          href: "/hr/candidate-recommendations",
        },
        { label: t.hrRecommendationsPage.compareTitle },
      ]}
    >
      <Suspense>
        <CompareRecommendationsPage />
      </Suspense>
    </AppShell>
  );
}
