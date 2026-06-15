import { Users, FileText, Zap, Download } from "lucide-react";
import { analyticsStats } from "@/data/admin";
import { cn } from "@/lib/utils";
import { portalCard, portalHeading, portalSubtext } from "@/lib/portal-ui";

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
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {analyticsStats.map((stat, i) => {
        const Icon = icons[i];
        return (
          <div
            key={stat.id}
            className={cn(portalCard, "shadow-sm p-5 animate-fade-up")}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(`w-11 h-11 rounded-lg flex items-center justify-center shrink-0`, iconBgs[i])}>
                <Icon size={20} className={iconColors[i]} />
              </div>
            </div>
            <p className={cn("text-[26px] font-bold leading-none", portalHeading)}>{stat.value}</p>
            <p className={cn("text-sm mt-1", portalSubtext)}>{stat.label}</p>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
