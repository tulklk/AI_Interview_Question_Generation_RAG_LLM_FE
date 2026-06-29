import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { CandidateProfile } from "@/features/candidate/components/profile/candidate-profile";

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
