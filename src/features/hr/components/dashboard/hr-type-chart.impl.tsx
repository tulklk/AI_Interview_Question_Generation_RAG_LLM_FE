"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionTypeCount } from "@/features/hr/hooks/use-hr-dashboard";

const TYPE_COLORS: Record<string, string> = {
  Technical: "#6C47FF",
  Behavioral: "#10B981",
  Situational: "#F59E0B",
  "System-design": "#3B82F6",
  "Problem-solving": "#EF4444",
};

const DEFAULT_COLORS = ["#6C47FF", "#10B981", "#F59E0B", "#3B82F6", "#EF4444"];

interface Props {
  data: QuestionTypeCount[];
}

export default function HrTypeChart({ data }: Props) {
  const chart = useChartTheme();
  const { t } = useLanguage();
  const p = t.hrDashboardPage.typeChart;

  const total = data.reduce((s, d) => s + d.count, 0);

  const chartData = data.map((d, i) => ({
    name: d.type,
    value: d.count,
    fill: TYPE_COLORS[d.type] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={84}
          paddingAngle={3}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} ${p.questions}`, undefined] as [string, undefined]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 11, fill: chart.axisTickFill, color: chart.axisTickFill }}>
              {value} ({Math.round(((chartData.find((d) => d.name === value)?.value ?? 0) / Math.max(total, 1)) * 100)}%)
            </span>
          )}
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
