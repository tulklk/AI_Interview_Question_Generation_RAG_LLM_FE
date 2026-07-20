import { cn } from "@/lib/cn";
import type { StatItem } from "@/features/dashboard/types/dashboard";

interface StatCardProps {
  stat: StatItem;
  labelOverride?: string;
}

export function StatCard({ stat, labelOverride }: StatCardProps) {
  return (
    <div className="hr-stat-card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10",
            stat.iconBg
          )}
        >
          <stat.icon size={20} className={stat.iconColor} />
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            stat.trendPositive
              ? "bg-violet-50 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-300"
              : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
          )}
        >
          ↑ {stat.trend}
        </span>
      </div>
      <div>
        <p className="text-[26px] font-bold text-gray-900 dark:text-gray-100 leading-none">
          {stat.value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{labelOverride ?? stat.label}</p>
      </div>
    </div>
  );
}
