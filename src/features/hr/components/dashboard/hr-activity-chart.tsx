"use client";

import dynamic from "next/dynamic";

export const HrActivityChart = dynamic(
  () => import("./hr-activity-chart.impl"),
  { ssr: false }
);
