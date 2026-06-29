"use client";

import dynamic from "next/dynamic";

// Lazy-load recharts client-side only to keep it out of the Worker server bundle.
export const AdminDashboardCategoryMix = dynamic(
  () => import("./admin-dashboard-category-mix.impl"),
  { ssr: false }
);
