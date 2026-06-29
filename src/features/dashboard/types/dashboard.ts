import type { ComponentType } from "react";

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

export interface WeeklyDataPoint {
  day: string;
  questions: number;
  jds: number;
}

export interface CategoryStat {
  name: string;
  count: number;
  color: string;
}

export interface RecentSession {
  id: string;
  title: string;
  role: string;
  roleColor: string;
  roleBg: string;
  questionsCount: number;
  relativeTime: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  badgeVariant?: "new" | "count";
}
