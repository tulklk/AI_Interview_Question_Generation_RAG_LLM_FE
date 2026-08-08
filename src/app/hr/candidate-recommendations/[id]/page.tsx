"use client";

import { use } from "react";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { RecommendationDetail } from "@/features/hr/components/recommendations/recommendation-detail";
import { useLanguage } from "@/shared/providers/language-context";

interface Props {
  params: Promise<{ id: string }>;
}

export default function CandidateRecommendationDetailPage({ params }: Props) {
  const { id } = use(params);
  const { t } = useLanguage();

  return (
    <AppShell
      pageTitle={t.hrRecommendationsPage.detailHeading}
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        {
          label: t.appShell.routes["/hr/candidate-recommendations"],
          href: "/hr/candidate-recommendations",
        },
        { label: t.appShell.breadcrumb.detail },
      ]}
    >
      <RecommendationDetail id={id} />
    </AppShell>
  );
}
