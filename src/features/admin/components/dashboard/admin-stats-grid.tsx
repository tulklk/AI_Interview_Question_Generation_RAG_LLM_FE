"use client";

import { adminStats } from "@/features/admin/data/admin";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { useLanguage } from "@/shared/providers/language-context";

const iconStyles = [
  { iconBg: "bg-violet-50 dark:bg-violet-950/40", iconColor: "text-violet-600 dark:text-violet-400" },
  { iconBg: "bg-blue-50 dark:bg-blue-950/40",     iconColor: "text-blue-600 dark:text-blue-400" },
  { iconBg: "bg-emerald-50 dark:bg-emerald-950/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { iconBg: "bg-amber-50 dark:bg-amber-950/40",   iconColor: "text-amber-600 dark:text-amber-400" },
];

export function AdminStatsGrid() {
  const { t } = useLanguage();
  const labels = t.adminPages.dashboard.statLabels;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {adminStats.map((stat, i) => (
        <div key={stat.id} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
          <StatCard stat={{ ...stat, ...iconStyles[i] }} labelOverride={labels[i]} />
        </div>
      ))}
    </div>
  );
}
