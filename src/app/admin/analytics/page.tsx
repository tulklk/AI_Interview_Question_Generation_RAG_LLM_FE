"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AnalyticsStats } from "@/features/admin/components/analytics/analytics-stats";
import { WeeklyUsageChart } from "@/features/admin/components/analytics/weekly-usage-chart";
import { CategoryChart } from "@/features/admin/components/analytics/category-chart";
import { RoleDistribution } from "@/features/admin/components/analytics/role-distribution";
import { BarChart2 } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

export default function SystemAnalyticsPage() {
  const { t } = useLanguage();
  const a = t.adminPages.analytics;

  return (
    <AdminAppShell
      pageTitle={a.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: a.heading }]}
    >
      <AdminPageHeader
        heading={a.heading}
        subtext={a.subtext}
        icon={BarChart2}
        iconGradient="bg-linear-to-br from-blue-500 to-cyan-500"
        accentGradient="bg-linear-to-r from-blue-500 via-cyan-400 to-primary"
        cardGradient="bg-linear-to-r from-blue-50 via-white to-cyan-50 dark:from-blue-950/20 dark:via-gray-900 dark:to-cyan-950/10"
        cardBorder="border-blue-100 dark:border-blue-900/30"
        iconShadow="shadow-blue-200 dark:shadow-blue-900/30"
      />

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AnalyticsStats />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <WeeklyUsageChart />
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-4 animate-fade-up lg:grid-cols-[1fr_380px] lg:gap-6"
        style={{ animationDelay: "240ms" }}
      >
        <CategoryChart />
        <RoleDistribution />
      </div>
    </AdminAppShell>
  );
}
