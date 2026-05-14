"use client";

import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AnalyticsStats } from "@/components/admin/analytics/analytics-stats";
import { WeeklyUsageChart } from "@/components/admin/analytics/weekly-usage-chart";
import { CategoryChart } from "@/components/admin/analytics/category-chart";
import { RoleDistribution } from "@/components/admin/analytics/role-distribution";
import { useLanguage } from "@/context/language-context";

export default function SystemAnalyticsPage() {
  const { t } = useLanguage();
  const a = t.adminPages.analytics;

  return (
    <AdminAppShell
      pageTitle={a.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: a.heading }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className="text-[30px] font-bold leading-9 text-[#111827]">{a.heading}</h2>
        <p className="text-base text-[#6b7280] leading-6 mt-2">{a.subtext}</p>
      </div>

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
