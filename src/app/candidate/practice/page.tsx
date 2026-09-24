import { Suspense } from "react";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { MarketplacePage } from "@/features/candidate/components/marketplace/marketplace-page";
import { MarketplacePageSkeleton } from "@/features/candidate/components/marketplace/marketplace-page-skeleton";

export default function JobseekerPracticePage() {
  return (
    <JobseekerAppShell pageTitle="Practice Now" breadcrumb={[{ label: "Jobseeker" }, { label: "Practice" }]}>
      <Suspense fallback={<MarketplacePageSkeleton />}>
        <MarketplacePage />
      </Suspense>
    </JobseekerAppShell>
  );
}
