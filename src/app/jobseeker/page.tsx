import { JobseekerAppShell } from "@/components/jobseeker/layout/jobseeker-app-shell";
import { MarketplacePage } from "@/components/jobseeker/marketplace/marketplace-page";

export default function JobseekerMarketplace() {
  return (
    <JobseekerAppShell pageTitle="Practice Now" breadcrumb={[{ label: "Jobseeker" }, { label: "Practice" }]}>
      <MarketplacePage />
    </JobseekerAppShell>
  );
}
