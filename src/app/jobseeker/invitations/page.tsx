"use client";

import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { InvitationsList } from "@/features/candidate/components/invitations/invitations-list";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

export default function InvitationsPage() {
  const { t } = useLanguage();
  const p = t.jobseekerInvitationsPage;

  return (
    <JobseekerAppShell
      pageTitle={p.heading}
      breadcrumb={[{ label: "jobseeker", href: "/jobseeker/dashboard" }, { label: p.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h1 className={cn("text-2xl font-bold", portalHeading)}>{p.heading}</h1>
        <p className={cn("text-sm mt-1", portalSubtext)}>{p.subtext}</p>
      </div>
      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <InvitationsList />
      </div>
    </JobseekerAppShell>
  );
}
