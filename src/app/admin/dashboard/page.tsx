"use client";

import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AdminWelcomeSection } from "@/components/admin/dashboard/admin-welcome-section";
import { AdminStatsGrid } from "@/components/admin/dashboard/admin-stats-grid";
import { AdminDashboardSecondaryStats } from "@/components/admin/dashboard/admin-dashboard-secondary-stats";
import { AdminDashboardWeeklyOverview } from "@/components/admin/dashboard/admin-dashboard-weekly-overview";
import { AdminDashboardCategoryMix } from "@/components/admin/dashboard/admin-dashboard-category-mix";
import { AdminDashboardTopRecruiters } from "@/components/admin/dashboard/admin-dashboard-top-recruiters";
import { UserGrowthChart } from "@/components/admin/dashboard/user-growth-chart";
import { QuestionsTrendChart } from "@/components/admin/dashboard/questions-trend-chart";
import { SystemActivityTable } from "@/components/admin/dashboard/system-activity-table";
import { useLanguage } from "@/context/language-context";

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  return (
    <AdminAppShell
      pageTitle={t.adminPages.dashboard.welcome.replace(" 👋", "")}
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
