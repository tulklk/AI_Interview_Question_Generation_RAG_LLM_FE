"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import type { TrendPoint } from "@/features/candidate/utils/dashboard-analytics";

interface Props {
  data: TrendPoint[];
}

function formatAxisDate(dateStr: string, lang: "en" | "vi"): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
}

export default function PerformanceTrendChart({ data }: Props) {
  const chart = useChartTheme();
  const { lang, t } = useLanguage();
  const c = t.jobseekerDashboardPage.trendChart;

  const average = Math.round(data.reduce((sum, p) => sum + p.score, 0) / data.length);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="perfTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => formatAxisDate(v, lang)}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          labelFormatter={(v) => formatAxisDate(String(v), lang)}
          formatter={(value) => [`${value}%`, c.scoreLabel] as [string, string]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          cursor={{ stroke: chart.gridStroke, strokeWidth: 1 }}
        />
        <ReferenceLine
          y={average}
          stroke="#22D3EE"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ value: `${c.average} ${average}%`, position: "insideTopRight", fontSize: 10, fill: "#22D3EE" }}
        />
        <Area
          type="monotone"
          dataKey="score"
          name={c.scoreLabel}
          stroke="#7C3AED"
          strokeWidth={2.5}
          fill="url(#perfTrendGrad)"
          dot={data.length <= 20}
          activeDot={{ r: 4, fill: "#7C3AED" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
