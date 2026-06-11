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
import { adminCategoryStats } from "@/data/admin";
import { useLanguage } from "@/context/language-context";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { cn } from "@/lib/utils";
import { portalCard, portalHeading, portalMutedBg, portalSubtext } from "@/lib/portal-ui";

export function CategoryChart() {
  const { t } = useLanguage();
  const cc = t.adminPages.analytics.categoryChart;
  const chart = useChartTheme();

  const max = Math.max(...adminCategoryStats.map((c) => c.count));

  return (
    <div className={cn(portalCard, "shadow-sm p-6 flex flex-col animate-fade-up")}>
      <div className="mb-1">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{cc.title}</h3>
        <p className={cn("text-xs mt-0.5", portalSubtext)}>{cc.subtitle}</p>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={adminCategoryStats}
            margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
            barSize={28}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: chart.axisTickFill }}
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
            <Bar dataKey="count" name={cc.questions} fill="#6c47ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 space-y-3">
        {adminCategoryStats.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3">
            <span className={cn("text-xs w-24 shrink-0", portalSubtext)}>{cat.name}</span>
            <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", portalMutedBg)}>
              <div
                className="h-full bg-[#6c47ff] rounded-full"
                style={{ width: `${(cat.count / max) * 100}%` }}
              />
            </div>
            <span className={cn("text-xs font-semibold w-12 text-right shrink-0", portalHeading)}>
              {cat.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
