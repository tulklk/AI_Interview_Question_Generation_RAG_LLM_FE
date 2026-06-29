"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminWelcomeSection } from "@/features/admin/components/dashboard/admin-welcome-section";
import { AdminStatsGrid } from "@/features/admin/components/dashboard/admin-stats-grid";
import { AdminDashboardSecondaryStats } from "@/features/admin/components/dashboard/admin-dashboard-secondary-stats";
import { AdminDashboardWeeklyOverview } from "@/features/admin/components/dashboard/admin-dashboard-weekly-overview";
import { AdminDashboardCategoryMix } from "@/features/admin/components/dashboard/admin-dashboard-category-mix";
import { AdminDashboardTopRecruiters } from "@/features/admin/components/dashboard/admin-dashboard-top-recruiters";
import { UserGrowthChart } from "@/features/admin/components/dashboard/user-growth-chart";
import { QuestionsTrendChart } from "@/features/admin/components/dashboard/questions-trend-chart";
import { SystemActivityTable } from "@/features/admin/components/dashboard/system-activity-table";

export default function AdminDashboardPage() {
  return (
    <AdminAppShell
      pageTitle="Dashboard"
      breadcrumb={[{ label: "Admin" }, { label: "Dashboard" }]}
    >
      <AdminWelcomeSection />

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AdminStatsGrid />
      </div>

      <AdminDashboardSecondaryStats />

      <div
        className="mt-5 grid grid-cols-1 gap-4 animate-fade-up md:grid-cols-2 md:gap-5"
        style={{ animationDelay: "160ms" }}
      >
        <UserGrowthChart />
        <QuestionsTrendChart />
      </div>

      <div
        className="mt-5 grid grid-cols-1 gap-4 animate-fade-up lg:grid-cols-2 lg:gap-5"
        style={{ animationDelay: "200ms" }}
      >
        <AdminDashboardWeeklyOverview />
        <AdminDashboardCategoryMix />
      </div>

      <div className="mt-5 animate-fade-up" style={{ animationDelay: "220ms" }}>
        <AdminDashboardTopRecruiters />
      </div>

      <div className="mt-5 animate-fade-up" style={{ animationDelay: "260ms" }}>
        <SystemActivityTable />
      </div>
    </AdminAppShell>
  );
}
