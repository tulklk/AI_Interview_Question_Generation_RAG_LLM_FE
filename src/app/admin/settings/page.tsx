"use client";

import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AdminSettingsLayout } from "@/components/admin/settings/admin-settings-layout";
import { useLanguage } from "@/context/language-context";

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const s = t.adminPages.settings;

  return (
    <AdminAppShell
      pageTitle={s.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: s.heading }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className="text-[30px] font-bold leading-9 text-[#111827]">{s.heading}</h2>
        <p className="text-base text-[#6b7280] leading-6 mt-2">{s.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AdminSettingsLayout />
      </div>
    </AdminAppShell>
  );
}
