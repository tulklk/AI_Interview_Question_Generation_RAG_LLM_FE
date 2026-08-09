import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  trend?: string;
  chart?: ReactNode;
  className?: string;
}

export function StatCard({ icon: Icon, iconBg, iconColor, value, label, trend, chart, className }: StatCardProps) {
  return (
    <div className={cn("hr-stat-card p-5 h-full", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10", iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
        {chart && <div className="opacity-60 flex items-end">{chart}</div>}
      </div>
      <p className="text-[24px] font-bold text-charcoal dark:text-gray-100 leading-none">{value}</p>
      <p className="text-[13px] text-[#6B7280] dark:text-gray-400 mt-1">{label}</p>
      {trend && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
          <TrendingUp size={10} />
          {trend}
        </p>
      )}
    </div>
  );
}
