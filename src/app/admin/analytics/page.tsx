"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AnalyticsStats } from "@/features/admin/components/analytics/analytics-stats";
import { WeeklyUsageChart } from "@/features/admin/components/analytics/weekly-usage-chart";
import { CategoryChart } from "@/features/admin/components/analytics/category-chart";
import { RoleDistribution } from "@/features/admin/components/analytics/role-distribution";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function SystemAnalyticsPage() {
  const { t } = useLanguage();
  const a = t.adminPages.analytics;

  return (
    <AdminAppShell
      pageTitle={a.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: a.heading }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{a.heading}</h2>
        <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{a.subtext}</p>
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
