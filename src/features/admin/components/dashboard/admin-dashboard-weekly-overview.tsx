"use client";

import dynamic from "next/dynamic";

// Lazy-load recharts client-side only to keep it out of the Worker server bundle.
export const AdminDashboardWeeklyOverview = dynamic(
  () => import("./admin-dashboard-weekly-overview.impl"),
  { ssr: false }
);
