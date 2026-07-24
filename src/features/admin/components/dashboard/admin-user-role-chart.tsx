"use client";

import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useCountUp } from "@/shared/hooks/use-count-up";
import type { AdminDashboardStats } from "@/features/admin/services/admin-dashboard.service";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  technical:   { label: "Kỹ thuật",   color: "#6c47ff" },
  behavioral:  { label: "Hành vi",    color: "#3b82f6" },
  situational: { label: "Tình huống", color: "#10b981" },
  cultural:    { label: "Văn hóa",    color: "#f59e0b" },
  leadership:  { label: "Lãnh đạo",   color: "#ef4444" },
};
const FALLBACK_COLOR = "#94a3b8";

interface Props {
  data: AdminDashboardStats | null;
  loading: boolean;
}

export function AdminUserRoleChart({ data, loading }: Props) {
  const chart = useChartTheme();
  const { ref, isInView } = useAdminInView();

  const counts = data?.questionTypeCounts ?? {};
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const animatedTotal = useCountUp(total, !loading && isInView);

  const chartData = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name:  TYPE_CONFIG[key]?.label ?? key,
      value,
      color: TYPE_CONFIG[key]?.color ?? FALLBACK_COLOR,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div ref={ref} className="hr-glass-card flex flex-col p-6">
      <div className="mb-3">
        <h3 className={cn("text-base font-bold", portalHeadingAlt)}>Phân bổ loại câu hỏi</h3>
        <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>Tỉ lệ câu hỏi theo từng thể loại</p>
      </div>

      {loading ? (
        <div className="h-55 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="flex h-55 items-center justify-center">
          <p className={cn("text-sm", portalSubtextAlt)}>Chưa có dữ liệu</p>
        </div>
      ) : !isInView ? (
        <div style={{ height: 220 }} />
      ) : (
        <div className="relative" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={58}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive
                animationBegin={0}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} câu (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                  name,
                ]}
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
                wrapperStyle={{ paddingTop: 8 }}
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: chart.axisTickFill }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            style={{ paddingBottom: 30 }}
          >
            <p className={cn("text-[22px] font-extrabold leading-none tabular-nums", portalHeadingAlt)}>
              {animatedTotal}
            </p>
            <p className={cn("mt-0.5 text-[10px] font-medium", portalSubtextAlt)}>Tổng câu hỏi</p>
          </div>
        </div>
      )}
    </div>
  );
}
