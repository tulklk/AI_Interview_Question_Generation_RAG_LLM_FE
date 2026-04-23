import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AnalyticsStats } from "@/components/admin/analytics/analytics-stats";
import { WeeklyUsageChart } from "@/components/admin/analytics/weekly-usage-chart";
import { CategoryChart } from "@/components/admin/analytics/category-chart";
import { RoleDistribution } from "@/components/admin/analytics/role-distribution";

export default function SystemAnalyticsPage() {
  return (
    <AdminAppShell
      pageTitle="System Analytics"
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Analytics" }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide performance and usage insights.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AnalyticsStats />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <WeeklyUsageChart />
      </div>

      <div
        className="grid grid-cols-[1fr_380px] gap-4 mt-4 animate-fade-up"
        style={{ animationDelay: "240ms" }}
      >
        <CategoryChart />
        <RoleDistribution />
      </div>
    </AdminAppShell>
  );
}
