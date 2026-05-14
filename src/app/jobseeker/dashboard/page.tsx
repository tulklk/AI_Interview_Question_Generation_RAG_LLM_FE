import { JobseekerAppShell } from "@/components/jobseeker/layout/jobseeker-app-shell";
import { CandidateDashboard } from "@/components/jobseeker/dashboard/candidate-dashboard";

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
