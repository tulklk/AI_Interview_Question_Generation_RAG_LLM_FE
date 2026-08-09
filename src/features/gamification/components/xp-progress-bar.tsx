"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { getLevelBarColor } from "@/features/gamification/utils/gamification-formatters";
import { useLanguage } from "@/shared/providers/language-context";

interface XpProgressBarProps {
  level: number;
  progressPercentage: number;
  currentLevelXp: number;
  xpRequiredForNextLevel: number;
  className?: string;
  showLabels?: boolean;
  height?: "xs" | "sm" | "md";
  animate?: boolean;
}

const HEIGHT_CLASS = {
  xs: "h-1.5",
  sm: "h-2",
  md: "h-2.5",
} as const;

export function XpProgressBar({
  level,
  progressPercentage,
  currentLevelXp,
  xpRequiredForNextLevel,
  className,
  showLabels = true,
  height = "sm",
  animate = true,
}: XpProgressBarProps) {
  const { t } = useLanguage();
  const g = t.gamification;
  const barRef = useRef<HTMLDivElement>(null);
  const color = getLevelBarColor(level);
  const pct   = Math.min(100, Math.max(0, progressPercentage));

  // Animate bar fill on mount
  useEffect(() => {
    if (!animate || !barRef.current) return;
    barRef.current.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const ariaLabel = g.ariaXpBar
    .replace("{{percent}}", String(pct));

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="flex items-center justify-between mb-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="font-medium tabular-nums">
            {currentLevelXp.toLocaleString()} XP
          </span>
          <span className="tabular-nums">
            {xpRequiredForNextLevel.toLocaleString()} XP
          </span>
        </div>
      )}

      {/* Track */}
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800",
          HEIGHT_CLASS[height]
        )}
      >
        {/* Fill */}
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{
            width: animate ? "0%" : `${pct}%`,
            backgroundColor: color,
            transition: animate ? "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
          }}
        />

        {/* Shimmer */}
        {pct > 5 && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
              animation: "shimmer 2.2s infinite linear",
              clipPath: `inset(0 ${100 - pct}% 0 0)`,
            }}
          />
        )}
      </div>

      {showLabels && (
        <p className="mt-0.5 text-right text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
          {g.xpToNextLevel}: {(xpRequiredForNextLevel - currentLevelXp).toLocaleString()} XP
        </p>
      )}
    </div>
  );
}
