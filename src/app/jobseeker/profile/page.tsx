import { JobseekerAppShell } from "@/components/jobseeker/layout/jobseeker-app-shell";
import { CandidateProfile } from "@/components/jobseeker/profile/candidate-profile";

export default function ProfilePage() {
  return (
    <JobseekerAppShell
      pageTitle="My Profile"
      breadcrumb={[{ label: "Jobseeker", href: "/jobseeker/dashboard" }, { label: "Profile" }]}
    >
      <div className="animate-fade-up">
        <CandidateProfile />
      </div>
    </JobseekerAppShell>
  );
}
