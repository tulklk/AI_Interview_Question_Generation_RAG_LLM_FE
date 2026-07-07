import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { MarketplacePage } from "@/features/candidate/components/marketplace/marketplace-page";

export default function JobseekerPracticePage() {
  return (
    <JobseekerAppShell pageTitle="Practice Now" breadcrumb={[{ label: "Jobseeker" }, { label: "Practice" }]}>
      <MarketplacePage />
    </JobseekerAppShell>
  );
}
