"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";
import type { CompletedSessionSummary } from "@/features/candidate/services/practice-session.service";

function scoreColor(avg: number): string {
  if (avg >= 80) return "#10B981";
  if (avg >= 65) return "#6C47FF";
  if (avg >= 50) return "#F59E0B";
  return "#EF4444";
}

interface Props {
  sessions: CompletedSessionSummary[];
}

export default function CompanyScoreChart({ sessions }: Props) {
  const chart = useChartTheme();
  const { t } = useLanguage();
  const c = t.jobseekerDashboardPage.companyScore;

  const scored = sessions.filter((s) => s.score !== null && s.company);

  // Group by company
  const map = new Map<string, { total: number; count: number }>();
  scored.forEach((s) => {
    const key = s.company;
    const existing = map.get(key) ?? { total: 0, count: 0 };
    map.set(key, { total: existing.total + (s.score as number), count: existing.count + 1 });
  });

  const data = Array.from(map.entries())
    .map(([company, { total, count }]) => ({
      company: company.length > 16 ? company.slice(0, 14) + "…" : company,
      avg: Math.round(total / count),
      count,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 52, bottom: 0, left: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="company"
          width={90}
          tick={{ fontSize: 11, fill: chart.axisTickFill }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, _name, props) => [
            `${value}% (${props.payload?.count ?? 0} ${c.sessions})`,
            c.avgScore,
          ] as [string, string]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: chart.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
        />
        <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
          <LabelList
            dataKey="avg"
            position="right"
            formatter={(v: unknown) => `${v}%`}
            style={{ fontSize: 11, fontWeight: 700, fill: chart.axisTickFill }}
          />
          {data.map((entry) => (
            <Cell key={entry.company} fill={scoreColor(entry.avg)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
