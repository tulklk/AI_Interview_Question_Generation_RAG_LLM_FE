"use client";

import dynamic from "next/dynamic";

// Lazy-load the recharts implementation client-side only so recharts stays out
// of the Cloudflare Worker server bundle (keeps it under the size limit).
export const QuestionsTrendChart = dynamic(() => import("./questions-trend-chart.impl"), {
  ssr: false,
});
