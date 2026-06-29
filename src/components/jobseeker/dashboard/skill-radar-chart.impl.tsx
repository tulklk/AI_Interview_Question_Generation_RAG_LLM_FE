"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { skillRadarData } from "@/data/jobseeker";
import { useChartTheme } from "@/hooks/use-chart-theme";

export default function SkillRadarChart() {
  const chart = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={skillRadarData}>
        <PolarGrid stroke={chart.gridStroke} />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fontSize: 11, fontFamily: "Be Vietnam Pro", fill: chart.axisTickFill }}
        />
        <Radar
          dataKey="score" stroke="#6C47FF" fill="#6C47FF" fillOpacity={0.12} strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
