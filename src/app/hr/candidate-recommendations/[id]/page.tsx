import type { Metadata } from "next";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { RecommendationDetail } from "@/features/hr/components/recommendations/recommendation-detail";

export const metadata: Metadata = {
  title: "Candidate Detail",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CandidateRecommendationDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AppShell pageTitle="Candidate Detail" breadcrumb={[{ label: "Candidate Recommendations", href: "/hr/candidate-recommendations" }, { label: "Detail" }]}>
      <RecommendationDetail id={id} />
    </AppShell>
  );
}
