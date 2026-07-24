"use client";

import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
import { Users, FileText, Zap, Download } from "lucide-react";
import { analyticsStats } from "@/features/admin/data/admin";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useCountUp } from "@/shared/hooks/use-count-up";

function AnalyticValue({ raw, active }: { raw: string; active: boolean }) {
  const num = parseFloat(raw.replace(/,/g, ""));
  const decimals = raw.includes(".") ? 1 : 0;
  const display = useCountUp(isNaN(num) ? 0 : num, active && !isNaN(num), decimals);
  return isNaN(num) ? <>{raw}</> : <>{display}</>;
}

const icons = [Users, FileText, Zap, Download];
const iconBgs = [
  "bg-blue-50 dark:bg-blue-950/40",
  "bg-violet-50 dark:bg-violet-950/40",
  "bg-orange-50 dark:bg-orange-950/40",
  "bg-emerald-50 dark:bg-emerald-950/40",
];
const iconColors = [
  "text-blue-500 dark:text-blue-400",
  "text-violet-500 dark:text-violet-400",
  "text-orange-500 dark:text-orange-400",
  "text-emerald-500 dark:text-emerald-400",
];

export function AnalyticsStats() {
  const { ref, isInView } = useAdminInView();

  return (
    <div ref={ref} className="grid grid-cols-4 gap-4 mb-6">
      {analyticsStats.map((stat, i) => {
        const Icon = icons[i];
        return (
          <div
            key={stat.id}
            className={cn("hr-stat-card p-5", isInView ? "animate-fade-up" : "opacity-0")}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10", iconBgs[i])}>
                <Icon size={20} className={iconColors[i]} />
              </div>
            </div>
            <p className={cn("text-[26px] font-bold leading-none tabular-nums", portalHeading)}>
              <AnalyticValue raw={stat.value} active={isInView} />
            </p>
            <p className={cn("text-sm mt-1", portalSubtext)}>{stat.label}</p>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
