"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { GenerateForm } from "@/features/interview/components/generate/generate-form";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

export default function HrGeneratePage() {
  const { t } = useLanguage();
  const gp = t.generatePage;

  return (
    <AppShell
      pageTitle={gp.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: gp.heading }]}
    >
      <div className="animate-fade-up">
        <div className="mb-6">
          <h2 className={cn("text-2xl font-bold", portalHeading)}>{gp.heading}</h2>
          <p className={cn("text-sm mt-1", portalSubtext)}>{gp.subtext}</p>
        </div>

        <GenerateForm />
      </div>
    </AppShell>
  );
}
