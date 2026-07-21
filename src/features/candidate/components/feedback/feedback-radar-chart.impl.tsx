"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";

interface Props {
  data: { skill: string; score: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot({ cx, cy }: any) {
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="#6C47FF" fillOpacity={0.12} />
      <circle cx={cx} cy={cy} r={5} fill="#6C47FF" stroke="white" strokeWidth={2} />
    </g>
  );
}

export default function FeedbackRadarChart({ data }: Props) {
  const chart = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="76%">
        <defs>
          <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C47FF" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.18} />
          </linearGradient>
        </defs>
        <PolarGrid
          stroke={chart.isDark ? "#2d3748" : "#e2e8f0"}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fontSize: 12, fill: chart.axisTickFill, fontWeight: 600 }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: chart.axisTickFill }}
          tickCount={5}
          axisLine={false}
          tickLine={false}
        />
        <Radar
          dataKey="score"
          stroke="#6C47FF"
          fill="url(#radarGrad)"
          fillOpacity={1}
          strokeWidth={2.5}
          dot={<CustomDot />}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
