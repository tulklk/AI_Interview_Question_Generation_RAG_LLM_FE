"use client";

import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { SettingsPage } from "@/features/candidate/components/settings/settings-page";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

export default function JobseekerSettingsPage() {
  const { t } = useLanguage();
  const p = t.jobseekerSettingsPage;

  return (
    <JobseekerAppShell
      pageTitle={p.heading}
      breadcrumb={[{ label: "Candidate", href: "/jobseeker/dashboard" }, { label: p.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{p.heading}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{p.subtitle}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <SettingsPage />
      </div>
    </JobseekerAppShell>
  );
}
