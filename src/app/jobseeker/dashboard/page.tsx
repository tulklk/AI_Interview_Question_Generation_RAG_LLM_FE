import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { CandidateDashboard } from "@/features/candidate/components/dashboard/candidate-dashboard";

export default function JobseekerDashboardPage() {
  return (
    <JobseekerAppShell
      pageTitle="Dashboard"
      breadcrumb={[{ label: "Jobseeker" }, { label: "Dashboard" }]}
    >
      <CandidateDashboard />
    </JobseekerAppShell>
  );
}
