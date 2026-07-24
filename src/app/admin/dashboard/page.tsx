"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminDashboard } from "@/features/admin/components/dashboard/admin-dashboard";

export default function AdminDashboardPage() {
  return (
    <AdminAppShell
      pageTitle="Dashboard"
      breadcrumb={[{ label: "Admin" }, { label: "Dashboard" }]}
    >
      <AdminDashboard />
    </AdminAppShell>
  );
}
