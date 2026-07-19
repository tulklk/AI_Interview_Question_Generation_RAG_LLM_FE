"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";

interface FeedbackRadarChartProps {
  data: { skill: string; score: number }[];
}

export default function FeedbackRadarChart({ data }: FeedbackRadarChartProps) {
  const chart = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke={chart.gridStroke} />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: chart.axisTickFill }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: chart.axisTickFill }}
          tickCount={5}
        />
        <Radar dataKey="score" stroke="#6c47ff" fill="#6c47ff" fillOpacity={0.35} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
