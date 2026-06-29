"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { adminCategoryStats } from "@/data/admin";
import { useLanguage } from "@/context/language-context";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { cn } from "@/lib/utils";
import { portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

const BAR_COLORS = ["#6c47ff", "#7c5cf0", "#957aed", "#a78bfa", "#c7b9ff"];

export default function AdminDashboardCategoryMix() {
  const { t } = useLanguage();
  const c = t.adminPages.dashboard.categoryMix;
  const chart = useChartTheme();

  const data = adminCategoryStats.map((row, i) => ({
    ...row,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="hr-glass-card flex flex-col p-6 animate-fade-up">
      <div className="mb-1">
        <h3 className={cn("text-base font-bold", portalHeadingAlt)}>{c.title}</h3>
        <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>{c.subtitle}</p>
      </div>

      <div className="mt-2" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxCount * 1.08]}
              tick={{ fontSize: 11, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tick={{ fontSize: 11, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [
                typeof value === "number" ? value.toLocaleString() : String(value ?? ""),
                c.countLabel,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                backgroundColor: chart.tooltipBg,
                border: `1px solid ${chart.tooltipBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              cursor={{ fill: chart.isDark ? "rgba(108, 71, 255, 0.12)" : "rgba(108, 71, 255, 0.06)" }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
