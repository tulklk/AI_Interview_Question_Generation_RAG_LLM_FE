"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

export default function HrSettingsPage() {
  const { t } = useLanguage();
  const sp = t.settingsPage;

  return (
    <AppShell
      pageTitle={sp.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: sp.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{sp.heading}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{sp.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <SettingsLayout />
      </div>
    </AppShell>
  );
}
