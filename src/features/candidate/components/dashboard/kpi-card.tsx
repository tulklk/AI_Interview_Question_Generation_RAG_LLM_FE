"use client";

import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { animate } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { InfoTooltip } from "@/features/candidate/components/ui/info-tooltip";
import { Sparkline } from "@/features/candidate/components/ui/sparkline";
import { Skeleton } from "@/shared/components/ui/skeleton";

export interface KpiCardCountUp {
  /** Target number to count up to from 0 */
  value: number;
  /** Optional suffix appended after the number (e.g. "%") */
  suffix?: string;
  /** Decimal places to show during animation (default 0) */
  decimals?: number;
  /** Custom formatter — overrides suffix/decimals when provided */
  formatter?: (v: number) => string;
}

export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tooltip?: string;
  trendLabel?: string;
  trendDirection?: "up" | "down" | "flat";
  trendPositiveIsGood?: boolean;
  sparklineData?: number[];
  loading?: boolean;
  /** When provided, the value animates from 0 to countUp.value on mount */
  countUp?: KpiCardCountUp;
}

function useCountUp(countUp: KpiCardCountUp | undefined, loading: boolean | undefined): string | null {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!countUp || loading) {
      setDisplay(null);
      return;
    }
    const { value, suffix = "", decimals = 0, formatter } = countUp;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => {
        setDisplay(
          formatter
            ? formatter(v)
            : `${v.toFixed(decimals)}${suffix}`
        );
      },
    });
    return () => controls.stop();
  }, [countUp, loading]);

  return display;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  tooltip,
  trendLabel,
  trendDirection,
  trendPositiveIsGood = true,
  sparklineData,
  loading,
  countUp,
}: KpiCardProps) {
  const animatedValue = useCountUp(countUp, loading);

  if (loading) {
    return (
      <div className="hr-stat-card p-5 h-full flex flex-col gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const isGoodTrend =
    trendDirection === "flat" || trendDirection === undefined
      ? null
      : trendDirection === "up"
        ? trendPositiveIsGood
        : !trendPositiveIsGood;

  const TrendIcon = trendDirection === "down" ? TrendingDown : trendDirection === "up" ? TrendingUp : Minus;
  const trendColor =
    isGoodTrend === null
      ? "text-gray-400 dark:text-gray-500"
      : isGoodTrend
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400";

  const displayValue = animatedValue ?? value;

  return (
    <div className="hr-stat-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-gray-100 dark:bg-gray-800">
          <Icon size={16} className="text-gray-900 dark:text-gray-100" />
        </div>
        {sparklineData && sparklineData.length >= 3 && (
          <div className="w-16 h-8">
            <Sparkline data={sparklineData} color="#7C3AED" />
          </div>
        )}
      </div>
      <p className={cn("text-[24px] font-[700] leading-none tabular-nums", portalHeadingAlt)}>{displayValue}</p>
      <div className="flex items-center gap-1 mt-1">
        <p className={cn("text-[13px]", portalSubtextAlt)}>{label}</p>
        {tooltip && <InfoTooltip label={tooltip} />}
      </div>
      {trendLabel && (
        <p className={cn("text-[11px] font-[500] mt-1.5 flex items-center gap-1", trendColor)}>
          <TrendIcon size={10} />
          {trendLabel}
        </p>
      )}
    </div>
  );
}
