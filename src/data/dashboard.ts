import {
  FileText,
  Zap,
  TrendingUp,
  BarChart3,
  LayoutDashboard,
  Sparkles,
  History,
  Settings,
} from "lucide-react";
import type {
  StatItem,
  WeeklyDataPoint,
  CategoryStat,
  RecentSession,
  NavItem,
} from "@/types/dashboard";

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Generate Questions",
    href: "/generate",
    icon: Sparkles,
    badge: "New",
    badgeVariant: "new",
  },
  {
    label: "History",
    href: "/history",
    icon: History,
    badge: 7,
    badgeVariant: "count",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const stats: StatItem[] = [
  {
    id: "jds-processed",
    label: "Total JDs Processed",
    value: "24",
    trend: "+12%",
    trendPositive: true,
    icon: FileText,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    id: "questions-generated",
    label: "Questions Generated",
    value: "186",
    trend: "+28%",
    trendPositive: true,
    icon: Zap,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
  },
  {
    id: "this-week",
    label: "This Week",
    value: "12",
    trend: "+4",
    trendPositive: true,
    icon: TrendingUp,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    id: "avg-questions",
    label: "Avg Questions / JD",
    value: "7.75",
    trend: "+0.5",
    trendPositive: true,
    icon: BarChart3,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
];

export const weeklyActivity: WeeklyDataPoint[] = [
  { day: "Mon", questions: 20, jds: 5 },
  { day: "Tue", questions: 25, jds: 8 },
  { day: "Wed", questions: 22, jds: 6 },
  { day: "Thu", questions: 38, jds: 9 },
  { day: "Fri", questions: 45, jds: 12 },
  { day: "Sat", questions: 30, jds: 8 },
  { day: "Sun", questions: 25, jds: 7 },
];

export const categoryStats: CategoryStat[] = [
  { name: "Technical", count: 68, color: "#6c47ff" },
  { name: "Behavioral", count: 42, color: "#6c47ff" },
  { name: "Situational", count: 35, color: "#6c47ff" },
  { name: "Cultural", count: 18, color: "#6c47ff" },
];

export const recentSessions: RecentSession[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    role: "Frontend",
    roleColor: "text-blue-600",
    roleBg: "bg-blue-50",
    questionsCount: 15,
    relativeTime: "3 hours ago",
  },
  {
    id: "2",
    title: "Product Manager",
    role: "Product",
    roleColor: "text-purple-600",
    roleBg: "bg-purple-50",
    questionsCount: 12,
    relativeTime: "1 day ago",
  },
  {
    id: "3",
    title: "Data Scientist",
    role: "Data",
    roleColor: "text-amber-600",
    roleBg: "bg-amber-50",
    questionsCount: 18,
    relativeTime: "2 days ago",
  },
  {
    id: "4",
    title: "Backend Developer",
    role: "Backend",
    roleColor: "text-emerald-600",
    roleBg: "bg-emerald-50",
    questionsCount: 14,
    relativeTime: "3 days ago",
  },
];
