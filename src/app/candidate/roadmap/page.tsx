import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { CandidateRoadmapPage } from "@/features/candidate/components/roadmap/candidate-roadmap-page";

export default function RoadmapPage() {
  return (
    <JobseekerAppShell
      pageTitle="Lộ trình"
      breadcrumb={[{ label: "Jobseeker" }, { label: "Roadmap" }]}
    >
      <CandidateRoadmapPage />
    </JobseekerAppShell>
  );
}
