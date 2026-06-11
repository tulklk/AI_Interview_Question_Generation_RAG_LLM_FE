import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_SHADOW } from "./constants";

interface StatCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  trend?: string;
  className?: string;
}

export function StatCard({ icon: Icon, iconBg, iconColor, value, label, trend, className }: StatCardProps) {
  return (
    <div
      className={cn("bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-xl p-5", className)}
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>
      <p className="text-[24px] font-[700] text-[#111827] dark:text-gray-100 leading-none">{value}</p>
      <p className="text-[13px] text-[#6B7280] dark:text-gray-400 mt-1">{label}</p>
      {trend && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-[500] mt-1 flex items-center gap-1">
          <TrendingUp size={10} />
          {trend}
        </p>
      )}
    </div>
  );
}
