"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { skillRadarData } from "@/data/jobseeker";
import { useChartTheme } from "@/hooks/use-chart-theme";

export default function FeedbackRadarChart() {
  const chart = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={skillRadarData}>
        <PolarGrid stroke={chart.gridStroke} />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fontSize: 12, fontFamily: "Be Vietnam Pro", fill: chart.axisTickFill, fontWeight: 500 }}
        />
        <Radar
          dataKey="score"
          stroke="#6C47FF"
          fill="#6C47FF"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            fontFamily: "Be Vietnam Pro",
            fontSize: 12,
            borderRadius: 8,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            color: chart.isDark ? "#F3F4F6" : "#111827",
          }}
          formatter={(v) => [`${v} / 100`, "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
