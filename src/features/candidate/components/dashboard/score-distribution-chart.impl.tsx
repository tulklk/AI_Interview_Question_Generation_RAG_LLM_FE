"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import type { CompletedSessionSummary } from "@/features/candidate/services/practice-session.service";

const RANGES = [
  { label: "0–20", min: 0, max: 20, fill: "#EF4444" },
  { label: "21–40", min: 21, max: 40, fill: "#F59E0B" },
  { label: "41–60", min: 41, max: 60, fill: "#A78BFA" },
  { label: "61–80", min: 61, max: 80, fill: "#6C47FF" },
  { label: "81–100", min: 81, max: 100, fill: "#10B981" },
];

interface Props {
  sessions: CompletedSessionSummary[];
}

export default function ScoreDistributionChart({ sessions }: Props) {
  const chart = useChartTheme();
  const { t } = useLanguage();
  const c = t.jobseekerDashboardPage.scoreDistribution;

  const scored = sessions.filter((s) => s.score !== null);

  const data = RANGES.map(({ label, min, max, fill }) => ({
    label,
    fill,
    count: scored.filter((s) => {
      const sc = s.score as number;
      return sc >= min && sc <= max;
    }).length,
  }));

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, maxCount + 1]}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value} ${c.sessions}`, c.countLabel] as [string, string]}
          labelFormatter={(label) => `${c.scoreLabel}: ${label}`}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: chart.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
