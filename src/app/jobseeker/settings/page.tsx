import { JobseekerAppShell } from "@/components/jobseeker/layout/jobseeker-app-shell";
import { SettingsPage } from "@/components/jobseeker/settings/settings-page";

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
