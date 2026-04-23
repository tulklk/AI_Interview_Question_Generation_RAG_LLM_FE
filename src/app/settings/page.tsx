import { AppShell } from "@/components/layout/app-shell";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default function SettingsPage() {
  return (
    <AppShell
      pageTitle="Settings"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Settings" }]}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account, preferences, and AI configuration.
        </p>
      </div>

      <SettingsLayout />
    </AppShell>
  );
}
