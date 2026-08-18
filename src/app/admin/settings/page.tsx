"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminSettingsLayout } from "@/features/admin/components/settings/admin-settings-layout";
import { Settings } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const s = t.adminPages.settings;

  return (
    <AdminAppShell
      pageTitle={s.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: s.heading }]}
    >
      <AdminPageHeader heading={s.heading} subtext={s.subtext} icon={Settings} />

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AdminSettingsLayout />
      </div>
    </AdminAppShell>
  );
}
