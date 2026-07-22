"use client";

import dynamic from "next/dynamic";

export const CompanyScoreChart = dynamic(
  () => import("./company-score-chart.impl"),
  { ssr: false }
);
