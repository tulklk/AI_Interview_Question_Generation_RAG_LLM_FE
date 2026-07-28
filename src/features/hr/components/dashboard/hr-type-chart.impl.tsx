"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionTypeCount } from "@/features/hr/hooks/use-hr-dashboard";

/** Canonical display keys — khớp màu + gộp biến thể underscore/PascalCase từ BE/Studio. */
const TYPE_COLORS: Record<string, string> = {
  Technical: "#6C47FF",
  Behavioral: "#10B981",
  Situational: "#F59E0B",
  "System-design": "#3B82F6",
  "Problem-solving": "#EF4444",
  "Follow-up": "#8B5CF6",
  Other: "#94A3B8",
};

const DEFAULT_COLORS = ["#6C47FF", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#94A3B8"];

const CANONICAL_ALIASES: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  situational: "Situational",
  "system-design": "System-design",
  system_design: "System-design",
  systemdesign: "System-design",
  "problem-solving": "Problem-solving",
  problem_solving: "Problem-solving",
  problemsolving: "Problem-solving",
  "follow-up": "Follow-up",
  follow_up: "Follow-up",
  followup: "Follow-up",
};

function canonicalizeType(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[\s]+/g, "-");
  const compact = key.replace(/[_-]/g, "");
  return (
    CANONICAL_ALIASES[key] ??
    CANONICAL_ALIASES[compact] ??
    (raw.trim() ? titleCaseHyphen(raw.trim()) : "Other")
  );
}

function titleCaseHyphen(raw: string): string {
  return raw
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("-");
}

/** Gộp slice trùng nhãn; nếu vẫn > maxSlices thì gộp phần còn lại thành Other. */
function aggregateTypes(data: QuestionTypeCount[], maxSlices = 5): QuestionTypeCount[] {
  const map = new Map<string, number>();
  for (const item of data) {
    const type = canonicalizeType(item.type);
    map.set(type, (map.get(type) ?? 0) + item.count);
  }

  const sorted = Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= maxSlices) return sorted;

  const head = sorted.slice(0, maxSlices - 1);
  const restCount = sorted.slice(maxSlices - 1).reduce((s, d) => s + d.count, 0);
  const otherIdx = head.findIndex((d) => d.type === "Other");
  if (otherIdx >= 0) {
    head[otherIdx] = { type: "Other", count: head[otherIdx].count + restCount };
    return head;
  }
  return [...head, { type: "Other", count: restCount }];
}

interface Props {
  data: QuestionTypeCount[];
}

export default function HrTypeChart({ data }: Props) {
  const chart = useChartTheme();
  const { t } = useLanguage();
  const p = t.hrDashboardPage.typeChart;

  const aggregated = aggregateTypes(data);
  const total = aggregated.reduce((s, d) => s + d.count, 0);

  const chartData = aggregated.map((d, i) => ({
    name: d.type,
    value: d.count,
    pct: Math.round((d.count / Math.max(total, 1)) * 100),
    fill: TYPE_COLORS[d.type] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="flex items-center gap-3 min-h-[220px]">
      {/* Donut — nhãn % chỉ hiện trên tooltip, không Legend Recharts */}
      <div className="relative w-[148px] h-[148px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={66}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const row = chartData.find((d) => d.name === name);
                return [`${value} ${p.questions} (${row?.pct ?? 0}%)`, String(name)] as [string, string];
              }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                backgroundColor: chart.tooltipBg,
                border: `1px solid ${chart.tooltipBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[18px] font-bold leading-none tabular-nums"
            style={{ color: chart.axisTickFill }}
          >
            {total}
          </span>
          <span className="mt-0.5 text-[10px] opacity-60" style={{ color: chart.axisTickFill }}>
            {p.questions}
          </span>
        </div>
      </div>

      {/* Legend dạng list — mỗi dòng 1 loại, tránh wrap chồng trong 400px */}
      <ul className="flex-1 min-w-0 flex flex-col gap-1.5 py-1">
        {chartData.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.fill }}
              aria-hidden
            />
            <span
              className="flex-1 min-w-0 truncate text-[11px] leading-tight"
              style={{ color: chart.axisTickFill }}
              title={entry.name}
            >
              {entry.name}
            </span>
            <span
              className="shrink-0 text-[11px] font-semibold tabular-nums"
              style={{ color: chart.axisTickFill }}
            >
              {entry.pct}%
            </span>
            <span className="shrink-0 w-7 text-right text-[10px] opacity-55 tabular-nums" style={{ color: chart.axisTickFill }}>
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
