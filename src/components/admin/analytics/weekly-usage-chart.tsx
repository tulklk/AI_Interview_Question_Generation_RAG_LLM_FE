"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { weeklyUsageData } from "@/data/admin";
import { useLanguage } from "@/context/language-context";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { cn } from "@/lib/utils";
import { portalCard, portalHeading, portalSubtext } from "@/lib/portal-ui";

export function WeeklyUsageChart() {
  const { t } = useLanguage();
  const wu = t.adminPages.analytics.weeklyUsage;
  const chart = useChartTheme();

  return (
    <div className={cn(portalCard, "shadow-sm p-6 flex flex-col animate-fade-up")}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>{wu.title}</h3>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{wu.subtitle}</p>
        </div>
        <div className={cn("flex items-center gap-4 text-xs", portalSubtext)}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6c47ff] inline-block" />
            {wu.activeUsers}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            {wu.jdSubmissions}
          </span>
        </div>
      </div>

      <div className="mt-4" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={weeklyUsageData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                backgroundColor: chart.tooltipBg,
                border: `1px solid ${chart.tooltipBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              cursor={{ stroke: chart.gridStroke, strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="users"
              name={wu.activeUsers}
              stroke="#6c47ff"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Line
              type="monotone"
              dataKey="submissions"
              name={wu.jdSubmissions}
              stroke="#34d399"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#34d399" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
