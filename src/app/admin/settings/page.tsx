"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminSettingsLayout } from "@/features/admin/components/settings/admin-settings-layout";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const s = t.adminPages.settings;

  return (
    <AdminAppShell
      pageTitle={s.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: s.heading }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{s.heading}</h2>
        <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{s.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AdminSettingsLayout />
      </div>
    </AdminAppShell>
  );
}
