"use client";

import { stats } from "@/data/dashboard";
import { StatCard } from "./stat-card";
import { useLanguage } from "@/context/language-context";

export function StatsGrid() {
  const { t } = useLanguage();
  const labels = t.dashboardPage.statLabels;

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={stat.id} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
          <StatCard stat={stat} labelOverride={labels[i]} />
        </div>
      ))}
    </div>
  );
}
