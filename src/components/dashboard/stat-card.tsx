import { cn } from "@/lib/utils";
import type { StatItem } from "@/types/dashboard";

interface StatCardProps {
  stat: StatItem;
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            stat.iconBg
          )}
        >
          <stat.icon size={20} className={stat.iconColor} />
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            stat.trendPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          )}
        >
          ↑ {stat.trend}
        </span>
      </div>
      <div>
        <p className="text-[26px] font-bold text-gray-900 leading-none">
          {stat.value}
        </p>
        <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
      </div>
    </div>
  );
}
