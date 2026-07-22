"use client";

import dynamic from "next/dynamic";

export const HrTypeChart = dynamic(
  () => import("./hr-type-chart.impl"),
  { ssr: false }
);
