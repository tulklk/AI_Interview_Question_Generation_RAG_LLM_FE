import type { ComponentType } from "react";

/** Shared by StatCard (Admin dashboard still uses it). */
export interface StatItem {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  icon: ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  badgeVariant?: "new" | "count";
}
