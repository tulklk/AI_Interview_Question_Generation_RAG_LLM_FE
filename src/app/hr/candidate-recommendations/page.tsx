import type { Metadata } from "next";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { RecommendationsList } from "@/features/hr/components/recommendations/recommendations-list";

export const metadata: Metadata = {
  title: "Candidate Recommendations",
};

export default function CandidateRecommendationsPage() {
  return (
    <AppShell pageTitle="Candidate Recommendations" breadcrumb={[{ label: "Candidate Recommendations" }]}>
      <RecommendationsList />
    </AppShell>
  );
}
