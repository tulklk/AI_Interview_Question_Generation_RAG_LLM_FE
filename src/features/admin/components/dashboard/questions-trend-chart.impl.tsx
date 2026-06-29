"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { questionsTrendData } from "@/features/admin/data/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { cn } from "@/lib/cn";
import { portalCard, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function QuestionsTrendChart() {
  const { t } = useLanguage();
  const qt = t.adminPages.dashboard.questionsTrend;
  const chart = useChartTheme();

  return (
    <div className={cn(portalCard, "flex flex-col p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none animate-fade-up")}>
      <div className="mb-1">
        <h3 className={cn("text-base font-bold", portalHeadingAlt)}>{qt.title}</h3>
        <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>{qt.subtitle}</p>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={questionsTrendData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            barSize={32}
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
              cursor={{ fill: chart.isDark ? "rgba(108, 71, 255, 0.12)" : "#f5f3ff" }}
            />
            <Bar
              dataKey="count"
              name={qt.questions}
              fill="#6c47ff"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
