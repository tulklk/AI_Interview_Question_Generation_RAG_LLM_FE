import { Suspense } from "react";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { HiringJobsPage } from "@/features/candidate/components/jobs/hiring-jobs-page";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

export default function CandidateJobsPage() {
  return (
    <JobseekerAppShell
      pageTitle="Jobs"
      breadcrumb={[{ label: "jobseeker", href: "/candidate/dashboard" }, { label: "jobs" }]}
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <AiLoadingSpinner />
          </div>
        }
      >
        <HiringJobsPage />
      </Suspense>
    </JobseekerAppShell>
  );
}
