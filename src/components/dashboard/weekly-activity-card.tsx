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
import { cn } from "@/lib/utils";
import { weeklyActivity } from "@/data/dashboard";
import { useLanguage } from "@/context/language-context";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

export function WeeklyActivityCard() {
  const { t } = useLanguage();
  const wa = t.dashboardPage.weeklyActivity;
  const chart = useChartTheme();

  return (
    <div className="hr-glass-card p-6 flex flex-col animate-fade-up">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>{wa.title}</h3>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{wa.subtitle}</p>
        </div>
        <div className={cn("flex items-center gap-4 text-xs", portalSubtext)}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6c47ff] inline-block" />
            {wa.questions}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            {wa.jds}
          </span>
        </div>
      </div>

      <div className="flex-1 mt-4" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={weeklyActivity}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="gradQuestions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c47ff" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#6c47ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradJDs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={[0, 60]}
              ticks={[0, 15, 30, 45, 60]}
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
            <Area
              type="monotone"
              dataKey="questions"
              name={wa.questions}
              stroke="#6c47ff"
              strokeWidth={2.5}
              fill="url(#gradQuestions)"
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Area
              type="monotone"
              dataKey="jds"
              name={wa.jds}
              stroke="#34d399"
              strokeWidth={2.5}
              fill="url(#gradJDs)"
              dot={false}
              activeDot={{ r: 4, fill: "#34d399" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
