"use client";

import { adminStats } from "@/data/admin";
import { StatCard } from "@/components/dashboard/stat-card";
import { useLanguage } from "@/context/language-context";

export function AdminStatsGrid() {
  const { t } = useLanguage();
  const labels = t.adminPages.dashboard.statLabels;

  return (
    <div className="grid grid-cols-4 gap-4">
      {adminStats.map((stat, i) => (
        <div key={stat.id} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
          <StatCard stat={stat} labelOverride={labels[i]} />
        </div>
      ))}
    </div>
  );
}
