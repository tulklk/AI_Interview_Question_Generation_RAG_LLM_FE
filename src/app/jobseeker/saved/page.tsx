import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { SavedSetsPage } from "@/features/candidate/components/saved/saved-sets-page";

export default function SavedPage() {
  return (
    <JobseekerAppShell
      pageTitle="Saved Sets"
      breadcrumb={[{ label: "jobseeker", href: "/jobseeker/dashboard" }, { label: "saved" }]}
    >
      <div className="animate-fade-up">
        <SavedSetsPage />
      </div>
    </JobseekerAppShell>
  );
}
