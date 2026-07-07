"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { skillRadarData } from "@/features/candidate/data/jobseeker";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { useLanguage } from "@/shared/providers/language-context";

export default function SkillRadarChart() {
  const chart = useChartTheme();
  const { t } = useLanguage();
  const labels = t.jobseekerDashboardPage.radarLabels as Record<string, string>;

  const translatedData = skillRadarData.map((d) => ({
    ...d,
    skill: labels[d.skill] ?? d.skill,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={translatedData}>
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
