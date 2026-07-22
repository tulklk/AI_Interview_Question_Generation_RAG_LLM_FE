"use client";

import dynamic from "next/dynamic";

export const ScoreDistributionChart = dynamic(
  () => import("./score-distribution-chart.impl"),
  { ssr: false }
);
