import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AdminSettingsLayout } from "@/components/admin/settings/admin-settings-layout";

export default function AdminSettingsPage() {
  return (
    <AdminAppShell
      pageTitle="Admin Settings"
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Settings" }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">Admin Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure platform behavior, AI model, access permissions, and notifications.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AdminSettingsLayout />
      </div>
    </AdminAppShell>
  );
}
