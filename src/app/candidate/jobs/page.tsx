import { Suspense } from "react";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { HiringJobsPage } from "@/features/candidate/components/jobs/hiring-jobs-page";
import { HiringJobsPageSkeleton } from "@/features/candidate/components/jobs/hiring-job-skeletons";

export default function CandidateJobsPage() {
  return (
    <JobseekerAppShell
      pageTitle="Jobs"
      breadcrumb={[{ label: "jobseeker", href: "/candidate/dashboard" }, { label: "jobs" }]}
    >
      <Suspense fallback={<HiringJobsPageSkeleton />}>
        <HiringJobsPage />
      </Suspense>
    </JobseekerAppShell>
  );
}
