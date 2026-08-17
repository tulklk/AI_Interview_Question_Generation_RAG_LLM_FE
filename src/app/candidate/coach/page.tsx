import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { CoachPage } from "@/features/candidate/components/coach/coach-page";

export default function JobseekerCoachRoute() {
  return (
    <JobseekerAppShell
      pageTitle="AI Coach"
      breadcrumb={[{ label: "jobseeker", href: "/candidate/dashboard" }, { label: "coach" }]}
    >
      <div className="animate-fade-up">
        <CoachPage />
      </div>
    </JobseekerAppShell>
  );
}
