"use client";

import { useTheme } from "@/context/theme-context";

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    isDark,
    gridStroke: isDark ? "#374151" : "#E5E7EB",
    axisTickFill: isDark ? "#9CA3AF" : "#6B7280",
    tooltipBg: isDark ? "#111827" : "#ffffff",
    tooltipBorder: isDark ? "#374151" : "#E5E7EB",
    chartGrid: isDark ? "#1f2937" : "#f0f0f0",
  };
}
