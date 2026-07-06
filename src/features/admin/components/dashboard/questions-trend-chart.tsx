"use client";

import dynamic from "next/dynamic";

// Lazy-load recharts client-side only to keep the server bundle lean.
export const QuestionsTrendChart = dynamic(() => import("./questions-trend-chart.impl"), {
  ssr: false,
});
