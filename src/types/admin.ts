import type { ComponentType } from "react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Recruiter" | "Guest";
  status: "Active" | "Pending" | "Suspended";
  createdDate: string;
  lastActive: string;
}

export interface SystemActivityEvent {
  id: string;
  type: "user_created" | "recruiter_login" | "jd_generation" | "export";
  description: string;
  actor: string;
  timestamp: string;
  metadata?: string;
}

export interface AdminStat {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  icon: ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
}

export interface UserGrowthPoint {
  week: string;
  admins: number;
  recruiters: number;
  guests: number;
}

export interface QuestionsTrendPoint {
  day: string;
  count: number;
}

export interface AnalyticsStat {
  id: string;
  label: string;
  value: string;
  sub: string;
}

export interface WeeklyUsagePoint {
  day: string;
  users: number;
  submissions: number;
}

export interface ContentSession {
  id: string;
  jobTitle: string;
  recruiter: string;
  recruiterEmail: string;
  date: string;
  questionsCount: number;
  exported: boolean;
  role: string;
  roleColor: string;
  roleBg: string;
}

export type AdminSettingsTab = "general" | "ai-config" | "permissions" | "notifications";
