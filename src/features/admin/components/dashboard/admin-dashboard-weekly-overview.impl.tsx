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
import { weeklyUsageData } from "@/features/admin/data/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function AdminDashboardWeeklyOverview() {
  const { t } = useLanguage();
  const w = t.adminPages.dashboard.weeklyOverview;
  const chart = useChartTheme();

  return (
    <div className="hr-glass-card flex flex-col p-6 animate-fade-up">
      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={cn("text-base font-bold", portalHeadingAlt)}>{w.title}</h3>
          <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>{w.subtitle}</p>
        </div>
        <div className={cn("flex flex-wrap items-center gap-4 text-xs", portalSubtextAlt)}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#6c47ff]" />
            {w.usersLegend}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a78bfa]" />
            {w.jdLegend}
          </span>
        </div>
      </div>

      <div className="mt-4" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyUsageData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: chart.axisTickFill }} axisLine={false} tickLine={false} />
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
              name={w.usersLegend}
              stroke="#6c47ff"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Line
              type="monotone"
              dataKey="submissions"
              name={w.jdLegend}
              stroke="#a78bfa"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#a78bfa" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
