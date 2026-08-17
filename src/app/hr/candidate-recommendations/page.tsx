"use client";

import { Suspense } from "react";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { RecommendationsList } from "@/features/hr/components/recommendations/recommendations-list";
import { useLanguage } from "@/shared/providers/language-context";

export default function CandidateRecommendationsPage() {
  const { t } = useLanguage();
  const title = t.appShell.routes["/hr/candidate-recommendations"];

  return (
    <AppShell
      pageTitle={title}
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        { label: title },
      ]}
    >
      <Suspense>
        <RecommendationsList />
      </Suspense>
    </AppShell>
  );
}
