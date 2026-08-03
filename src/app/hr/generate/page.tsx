"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className={cn("text-2xl font-bold", portalHeading)}>{gp.heading}</h2>
            <p className={cn("text-sm mt-1 max-w-lg", portalSubtext)}>{gp.subtext}</p>
          </div>
          <Link
            href="/hr/generate/manual"
            className="inline-flex items-center gap-2 self-start sm:self-auto shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary/40 transition-colors shadow-sm"
            aria-label={gp.manualBtn}
          >
            <PenLine size={14} className="text-primary" />
            {gp.manualBtn}
          </Link>
        </div>

        <GenerateForm />
      </div>
    </AppShell>
  );
}
