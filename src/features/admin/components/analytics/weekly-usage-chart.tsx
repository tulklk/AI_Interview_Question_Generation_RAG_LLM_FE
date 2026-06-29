"use client";

import dynamic from "next/dynamic";

// Lazy-load recharts client-side only to keep it out of the Worker server bundle.
export const WeeklyUsageChart = dynamic(() => import("./weekly-usage-chart.impl"), {
  ssr: false,
});
