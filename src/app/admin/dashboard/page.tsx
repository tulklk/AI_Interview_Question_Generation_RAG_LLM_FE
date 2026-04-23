import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AdminWelcomeSection } from "@/components/admin/dashboard/admin-welcome-section";
import { AdminStatsGrid } from "@/components/admin/dashboard/admin-stats-grid";
import { UserGrowthChart } from "@/components/admin/dashboard/user-growth-chart";
import { QuestionsTrendChart } from "@/components/admin/dashboard/questions-trend-chart";
import { SystemActivityTable } from "@/components/admin/dashboard/system-activity-table";

export default function AdminDashboardPage() {
  return (
    <AdminAppShell
      pageTitle="Admin Dashboard"
      breadcrumb={[{ label: "Admin" }, { label: "Dashboard" }]}
    >
      <AdminWelcomeSection />

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AdminStatsGrid />
      </div>

      <div
        className="grid grid-cols-2 gap-4 mt-5 animate-fade-up"
        style={{ animationDelay: "160ms" }}
      >
        <UserGrowthChart />
        <QuestionsTrendChart />
      </div>

      <div className="mt-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <SystemActivityTable />
      </div>
    </AdminAppShell>
  );
}
