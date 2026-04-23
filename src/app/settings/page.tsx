"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { useLanguage } from "@/context/language-context";

export default function SettingsPage() {
  const { t } = useLanguage();
  const sp = t.settingsPage;

  return (
    <AppShell
      pageTitle={sp.heading}
      breadcrumb={[{ label: "Home", href: "/" }, { label: sp.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">{sp.heading}</h2>
        <p className="text-sm text-gray-500 mt-1">{sp.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <SettingsLayout />
      </div>
    </AppShell>
  );
}
