"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { animate } from "framer-motion";
import { cn } from "@/lib/cn";

export interface StatCardCountUp {
  value: number;
  suffix?: string;
  decimals?: number;
  formatter?: (v: number) => string;
}

interface StatCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  trend?: string;
  chart?: ReactNode;
  className?: string;
  /** When provided, the value counts up from 0 on mount / when value changes */
  countUp?: StatCardCountUp;
}

function useCountUp(countUp: StatCardCountUp | undefined): string | null {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!countUp) { setDisplay(null); return; }

    const { value, suffix = "", decimals = 0, formatter } = countUp;
    // Always animate from 0 → value whenever value changes
    setDisplay(formatter ? formatter(0) : `${(0).toFixed(decimals)}${suffix}`);
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => {
        setDisplay(
          formatter ? formatter(v) : `${v.toFixed(decimals)}${suffix}`,
        );
      },
    });
    return () => controls.stop();
  // Re-animate whenever the target value changes (e.g. after async stats load)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countUp?.value]);

  return display;
}

export function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
  chart,
  className,
  countUp,
}: StatCardProps) {
  const animatedValue = useCountUp(countUp);
  const displayValue = animatedValue ?? value;

  return (
    <div className={cn("hr-stat-card p-5 h-full", className)}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10",
            iconBg,
          )}
        >
          <Icon size={16} className={iconColor} />
        </div>
        {chart && (
          <div className="opacity-70 flex items-end">
            {chart}
          </div>
        )}
      </div>
      <p className="text-[24px] font-bold text-charcoal dark:text-gray-100 leading-none tabular-nums">
        {displayValue}
      </p>
      <p className="text-[13px] text-[#6B7280] dark:text-gray-400 mt-1">
        {label}
      </p>
      {trend && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
          <TrendingUp size={10} />
          {trend}
        </p>
      )}
    </div>
  );
}
