"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import type { DailyActivity } from "@/features/hr/hooks/use-hr-dashboard";

interface Props {
  data: DailyActivity[];
}

// Show every 5th tick to avoid crowding
function shouldShowTick(index: number, total: number): boolean {
  if (total <= 7) return true;
  return index === 0 || index === total - 1 || index % 5 === 0;
}

export default function HrActivityChart({ data }: Props) {
  const chart = useChartTheme();
  const { t } = useLanguage();
  const p = t.hrDashboardPage.activityChart;

  const ticks = data
    .map((d, i) => (shouldShowTick(i, data.length) ? d.date : null))
    .filter(Boolean) as string[];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="hrActivityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6C47FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6C47FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value}`, p.sessions] as [string, string]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          cursor={{ stroke: chart.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="sessions"
          stroke="#6C47FF"
          strokeWidth={2.5}
          fill="url(#hrActivityGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#6C47FF", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
