import { AppShell } from "@/features/hr/components/layout/app-shell";
import { HrDashboard } from "@/features/hr/components/dashboard/hr-dashboard";

export default function HrDashboardPage() {
  return (
    <AppShell
      pageTitle="Dashboard"
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: "Dashboard" }]}
    >
      <HrDashboard />
    </AppShell>
  );
}
