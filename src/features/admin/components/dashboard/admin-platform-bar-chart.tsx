"use client";

import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
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
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import type { AdminDashboardStats } from "@/features/admin/services/admin-dashboard.service";

interface Props {
  data: AdminDashboardStats | null;
  loading: boolean;
}

export function AdminPlatformBarChart({ data, loading }: Props) {
  const chart = useChartTheme();
  const { ref, isInView } = useAdminInView();

  const chartData = [
    { name: "Bộ câu hỏi",     value: data?.totalQuestionSets ?? 0, color: "#6c47ff", unit: "bộ" },
    { name: "Dễ",              value: data?.easySets          ?? 0, color: "#10b981", unit: "bộ" },
    { name: "Trung bình",      value: data?.mediumSets        ?? 0, color: "#f59e0b", unit: "bộ" },
    { name: "Khó",             value: data?.hardSets          ?? 0, color: "#ef4444", unit: "bộ" },
    { name: "Tổng câu hỏi",   value: data?.totalQuestions    ?? 0, color: "#3b82f6", unit: "câu" },
    { name: "Lượt luyện tập", value: data?.totalAttempts     ?? 0, color: "#8b5cf6", unit: "lượt" },
  ];

  const maxVal = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div ref={ref} className="hr-glass-card flex flex-col p-6">
      <div className="mb-3">
        <h3 className={cn("text-base font-bold", portalHeadingAlt)}>Thống kê bộ câu hỏi</h3>
        <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>Phân bổ theo độ khó và hoạt động</p>
      </div>

      {loading ? (
        <div className="h-55 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : !isInView ? (
        <div style={{ height: 220 }} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, Math.ceil(maxVal * 1.2)]}
              tick={{ fontSize: 11, fill: chart.axisTickFill }}
              axisLine={false}
              tickLine={false}
              width={34}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: { unit?: string } }) => [
                `${value.toLocaleString()} ${props.payload?.unit ?? ""}`,
                "Số lượng",
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                backgroundColor: chart.tooltipBg,
                border: `1px solid ${chart.tooltipBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              cursor={{ fill: chart.isDark ? "rgba(108,71,255,0.10)" : "rgba(108,71,255,0.05)" }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              barSize={32}
              maxBarSize={48}
              isAnimationActive
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
