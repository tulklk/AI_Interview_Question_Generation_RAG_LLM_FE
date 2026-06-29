import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { SettingsPage } from "@/features/candidate/components/settings/settings-page";

export default function JobseekerSettingsPage() {
  return (
    <JobseekerAppShell
      pageTitle="Settings"
      breadcrumb={[{ label: "Jobseeker", href: "/jobseeker/dashboard" }, { label: "Settings" }]}
    >
      <SettingsPage />
    </JobseekerAppShell>
  );
}
